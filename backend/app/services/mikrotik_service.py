"""
mikrotik_service.py — calls the WiBill local bridge at 
https://mikrotik.wi-bill.com which proxies to the router via librouteros.
"""
import asyncio
import httpx
import uuid
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.mikrotik_config import MikrotikConfig

logger = logging.getLogger("wibill.mikrotik")


async def test_connection(cfg, timeout: float = 5.0) -> bool:
    """
    Real reachability + RouterOS API port check for a MikrotikConfig row.
    Opens a raw TCP connection to router_ip:api_port -- confirms the router
    is up and the API service is actually listening (not just that the
    host responds to ICMP, which many networks block anyway).
    """
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(cfg.router_ip, cfg.api_port),
            timeout=timeout,
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True
    except (OSError, asyncio.TimeoutError):
        return False


async def _get_config(tenant_id: str, db: AsyncSession) -> Optional[MikrotikConfig]:
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == uuid.UUID(tenant_id))
    )
    return result.scalar_one_or_none()


def _bridge_url(config: MikrotikConfig) -> str:
    host = config.router_ip
    if host.startswith("http"):
        return host.rstrip("/")
    return f"http://{host}:{config.api_port}"


def _duration_str(expires_at: datetime) -> str:
    delta = expires_at - datetime.utcnow()
    total = max(int(delta.total_seconds()), 60)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


async def check_mikrotik_connection(tenant_id: str, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"connected": False, "error": "No MikroTik config saved for this ISP"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{_bridge_url(config)}/test")
            if r.status_code == 200:
                return r.json()
            return {"connected": False, "error": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except httpx.ConnectError:
        return {"connected": False, "error": "Cannot reach bridge — check cloudflared and bridge.py are running"}
    except httpx.TimeoutException:
        return {"connected": False, "error": "Bridge timed out — check bridge.py is running on port 8080"}
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
        logger.warning(f"No MikroTik config for tenant {tenant_id} — skipping provisioning")
        return {"success": False, "message": "No MikroTik config", "user_id": None}

    payload = {
        "username": username,
        "password": password,
        "mac_address": mac_address,
        "limit_uptime": _duration_str(expires_at),
        "session_id": session_id,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{_bridge_url(config)}/users/create", json=payload)
            data = r.json()
            if r.status_code == 200:
                logger.info(f"MikroTik user '{username}' provisioned via bridge")
                return {
                    "success": True,
                    "message": f"User '{username}' created on router",
                    "user_id": data.get("router_id"),
                }
            return {"success": False, "message": data.get("detail", "Bridge error"), "user_id": None}
    except Exception as e:
        logger.error(f"Bridge error creating MikroTik user: {e}")
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
            r = await client.post(
                f"{_bridge_url(config)}/users/remove",
                json={"username": username}
            )
            if r.status_code == 200:
                return r.json()
            return {"success": False, "message": r.text[:200]}
    except Exception as e:
        logger.error(f"Bridge error removing MikroTik user: {e}")
        return {"success": False, "message": str(e)}


async def remove_hotspot_user_by_session(
    tenant_id: str,
    session_id: str,
    db: AsyncSession,
) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_bridge_url(config)}/users/remove-by-tag",
                json={"session_id": session_id}
            )
            if r.status_code == 200:
                return r.json()
            return {"success": False, "message": r.text[:200]}
    except Exception as e:
        logger.error(f"Bridge error removing by session tag: {e}")
        return {"success": False, "message": str(e)}


async def get_active_users(tenant_id: str, db: AsyncSession) -> list:
    config = await _get_config(tenant_id, db)
    if not config:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{_bridge_url(config)}/users/active")
            return r.json().get("users", [])
    except Exception:
        return []
