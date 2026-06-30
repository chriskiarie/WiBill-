"""
MikroTik RouterOS integration via bridge HTTP API.
Makes async httpx calls to the bridge running on the AnyDesk machine,
which proxies librouteros commands to the router.
"""
import uuid
import logging
from datetime import datetime
from typing import Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.mikrotik_config import MikrotikConfig

logger = logging.getLogger("wibill.mikrotik")


async def _get_config(tenant_id: str, db: AsyncSession) -> Optional[MikrotikConfig]:
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == uuid.UUID(tenant_id))
    )
    return result.scalar_one_or_none()


def _bridge_url(config: MikrotikConfig) -> str:
    port = config.api_port if config.api_port else 443
    return f"https://{config.router_ip}:{port}"


async def check_mikrotik_connection(tenant_id: str, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"connected": False, "error": "No MikroTik config saved for this ISP"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{_bridge_url(config)}/test")
        if r.status_code == 200:
            return r.json()
        return {"connected": False, "error": f"Bridge returned HTTP {r.status_code}: {r.text}"}
    except httpx.ConnectError as e:
        return {"connected": False, "error": f"Cannot reach bridge at {config.router_ip}:{config.api_port} — {e}"}
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def create_mikrotik_user(
    tenant_id: str,
    session_id: str,
    mac_address: str,
    ip_address: str,
    username: str,
    password: str,
    expires_at: datetime,
    db: AsyncSession,
) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        logger.warning(f"No MikroTik config for tenant {tenant_id} — session active in DB but router not updated")
        return {"success": False, "message": "No MikroTik config — router not updated", "user_id": None}

    delta = expires_at - datetime.utcnow()
    total = max(int(delta.total_seconds()), 60)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    limit_uptime = f"{h:02d}:{m:02d}:{s:02d}"

    payload = {
        "username": username,
        "password": password,
        "mac_address": mac_address.upper(),
        "limit_uptime": limit_uptime,
        "session_id": session_id,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{_bridge_url(config)}/users/create", json=payload)
        if r.status_code != 200:
            logger.error(f"Bridge create user failed: {r.status_code} {r.text}")
            return {"success": False, "message": f"Bridge error: {r.text}", "user_id": None}

        data = r.json()
        logger.info(f"MikroTik user '{username}' created via bridge, expires in {limit_uptime}")
        return {
            "success": data.get("success", True),
            "message": f"Hotspot user '{username}' created",
            "user_id": data.get("router_id"),
            "limit_uptime": limit_uptime,
        }
    except httpx.ConnectError as e:
        return {"success": False, "message": f"Cannot reach bridge: {e}", "user_id": None}
    except Exception as e:
        logger.error(f"Error creating MikroTik user via bridge: {e}")
        return {"success": False, "message": str(e), "user_id": None}


async def remove_mikrotik_user(
    tenant_id: str,
    session_id: str,
    username: str,
    db: AsyncSession,
) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{_bridge_url(config)}/users/remove", json={"username": username})
        if r.status_code != 200:
            return {"success": False, "message": f"Bridge error: {r.text}"}
        data = r.json()
        logger.info(f"MikroTik user '{username}' removed via bridge")
        return {"success": True, "message": f"Removed '{username}' from router"}
    except Exception as e:
        logger.error(f"Error removing MikroTik user: {e}")
        return {"success": False, "message": str(e)}


async def remove_hotspot_user_by_session(
    tenant_id: str,
    session_id: str,
    db: AsyncSession,
) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    tag = f"wibill-{session_id[:8]}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{_bridge_url(config)}/users/remove-by-tag", json={"tag": tag})
        if r.status_code != 200:
            return {"success": False, "message": f"Bridge error: {r.text}"}
        data = r.json()
        return {"success": True, "message": f"Removed {data.get('removed_count', 0)} user(s) by session tag"}
    except Exception as e:
        return {"success": False, "message": str(e)}


async def get_active_users(tenant_id: str, db: AsyncSession) -> list:
    config = await _get_config(tenant_id, db)
    if not config:
        return []

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{_bridge_url(config)}/users/active")
        if r.status_code == 200:
            data = r.json()
            return data.get("users", [])
        return []
    except Exception:
        return []
