"""
mikrotik_service.py — calls the WiBill per-ISP bridge at
https://{router_ip}/ which proxies to the router via librouteros.

router_ip can be one of three shapes depending on the ISP's setup:
  1. Full URL starting with http → used as-is (legacy bridge URL)
  2. Valid IP address (192.168.88.1) → direct http://ip:port (no bridge)
  3. Hostname (isp-{slug}.wi-bill.com) → https://hostname (tunnel)
"""
import httpx
import ipaddress
import uuid
import logging
from datetime import datetime
from typing import Optional
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
    """
    Build the correct base URL for a MikroTik router bridge.

    Three cases:
    - Full URL (starts with http) → use as-is (legacy/override)
    - Raw IP address → direct http://ip:port bypassing tunnel (no bridge)
    - Hostname (tunnel subdomain) → https://hostname (goes through Cloudflare)
    """
    host = config.router_ip
    if host.startswith("http"):
        return host.rstrip("/")
    try:
        ipaddress.ip_address(host)
        return f"http://{host}:{config.api_port}"
    except ValueError:
        return f"https://{host}"


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
