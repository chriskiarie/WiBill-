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
from app.services.crypto_service import decrypt

logger = logging.getLogger("wibill.mikrotik")


async def _get_config(tenant_id: str, db: AsyncSession) -> Optional[MikrotikConfig]:
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == uuid.UUID(tenant_id))
    )
    return result.scalar_one_or_none()


def _bridge_url(config: MikrotikConfig) -> str:
    """
    Build the correct base URL for a MikroTik router bridge.

    Prefer tunnel_hostname (Cloudflare tunnel) if available, otherwise
    fall back to router_ip which may be a direct LAN IP.
    """
    host = config.tunnel_hostname or config.router_ip
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


def _bridge_headers(config: MikrotikConfig) -> dict:
    """Build headers including bridge auth secret if configured."""
    headers = {}
    if config.bridge_secret_enc:
        headers["X-WiBill-Bridge-Secret"] = decrypt(config.bridge_secret_enc)
    return headers


def _friendly_bridge_error(status_code: int, body: str) -> str:
    if status_code == 502:
        return "Bridge is offline — ensure bridge.py is running on the same network as the router and the tunnel is active"
    if status_code == 503:
        return "Bridge is busy — try again in a few seconds"
    if status_code == 401:
        return "Bridge authentication failed — check the bridge secret"
    if "<html" in body.lower() or "<!doctype" in body.lower():
        return f"Unexpected response from bridge (HTTP {status_code}) — bridge may be down or misconfigured"
    preview = body[:200].strip()
    return preview if preview else f"Bridge error {status_code}"


async def _bridge_post(tenant_id: str, path: str, payload: dict, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "error": "No MikroTik config"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{_bridge_url(config)}{path}", json=payload, headers=_bridge_headers(config))
            if r.status_code == 200:
                return {"success": True, "data": r.json()}
            return {"success": False, "error": _friendly_bridge_error(r.status_code, r.text)}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def _bridge_get(tenant_id: str, path: str, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "error": "No MikroTik config"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{_bridge_url(config)}{path}", headers=_bridge_headers(config))
            if r.status_code == 200:
                return {"success": True, "data": r.json()}
            return {"success": False, "error": _friendly_bridge_error(r.status_code, r.text)}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def get_wireless_interfaces(tenant_id: str, db: AsyncSession) -> dict:
    return await _bridge_get(tenant_id, "/interfaces/wireless", db)

async def get_hotspot_hosts(tenant_id: str, db: AsyncSession) -> dict:
    return await _bridge_get(tenant_id, "/hosts", db)

async def stage_portal_file(tenant_id: str, content: str, path: str, db: AsyncSession) -> dict:
    return await _bridge_post(tenant_id, "/file/stage", {"content": content, "path": path}, db)

async def push_file_to_router(tenant_id: str, file_id: str, fetch_url: str, dst_path: str, db: AsyncSession) -> dict:
    return await _bridge_post(tenant_id, "/file/push-to-router", {"file_id": file_id, "fetch_url": fetch_url, "dst_path": dst_path}, db)

async def check_file_on_router(tenant_id: str, path: str, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"exists": False, "error": "No MikroTik config"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{_bridge_url(config)}/file/status/{path}", headers=_bridge_headers(config))
            if r.status_code == 200:
                return r.json()
            return {"exists": False, "error": f"Bridge error {r.status_code}"}
    except Exception as e:
        return {"exists": False, "error": str(e)}


async def check_mikrotik_connection(tenant_id: str, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"connected": False, "error": "No MikroTik config saved for this ISP"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{_bridge_url(config)}/test", headers=_bridge_headers(config))
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
            r = await client.post(f"{_bridge_url(config)}/users/create", json=payload, headers=_bridge_headers(config))
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
                json={"username": username},
                headers=_bridge_headers(config),
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
                json={"session_id": session_id},
                headers=_bridge_headers(config),
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
            r = await client.get(f"{_bridge_url(config)}/users/active", headers=_bridge_headers(config))
            return r.json().get("users", [])
    except Exception:
        return []


# ============================================================================
# MONTHLY SUBSCRIBER (Static IP) ENDPOINTS — bridge → MikroTik
# ============================================================================

async def provision_subscriber(
    tenant_id: str,
    subscriber_id: str,
    ip_address: str,
    mac_address: str,
    plan_id: str | None = None,
    db: AsyncSession = None,
) -> dict:
    """Provision a static IP subscriber on the MikroTik router via bridge."""
    config = await _get_config(tenant_id, db)
    if not config:
        logger.warning(f"No MikroTik config for tenant {tenant_id} — skipping subscriber provision")
        return {"success": False, "message": "No MikroTik config"}

    payload = {
        "subscriber_id": subscriber_id,
        "ip_address": ip_address,
        "mac_address": mac_address,
        "plan_id": plan_id,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_bridge_url(config)}/subscriber/activate",
                json=payload,
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                logger.info(f"Subscriber {subscriber_id} provisioned on router")
                return {"success": True, "message": "Provisioned on router", "data": r.json()}
            return {"success": False, "message": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.error(f"Bridge subscriber provision error: {e}")
        return {"success": False, "message": str(e)}


async def deprovision_subscriber(
    tenant_id: str,
    subscriber_id: str,
    ip_address: str,
    db: AsyncSession = None,
) -> dict:
    """Remove a static IP subscriber from the MikroTik router."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    payload = {"subscriber_id": subscriber_id, "ip_address": ip_address}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_bridge_url(config)}/subscriber/deactivate",
                json=payload,
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return {"success": True, "message": "Deprovisioned from router"}
            return {"success": False, "message": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.error(f"Bridge deprovision error: {e}")
        return {"success": False, "message": str(e)}


async def pause_subscriber_traffic(
    tenant_id: str,
    subscriber_id: str,
    ip_address: str,
    db: AsyncSession = None,
) -> dict:
    """Block/drop traffic for a subscriber IP (pause or suspend)."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    payload = {"subscriber_id": subscriber_id, "ip_address": ip_address}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_bridge_url(config)}/subscriber/pause",
                json=payload,
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return {"success": True, "message": "Traffic blocked on router"}
            return {"success": False, "message": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.error(f"Bridge pause error: {e}")
        return {"success": False, "message": str(e)}


async def resume_subscriber_traffic(
    tenant_id: str,
    subscriber_id: str,
    ip_address: str,
    db: AsyncSession = None,
) -> dict:
    """Unblock traffic for a subscriber IP (resume from pause/suspend)."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    payload = {"subscriber_id": subscriber_id, "ip_address": ip_address}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_bridge_url(config)}/subscriber/resume",
                json=payload,
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return {"success": True, "message": "Traffic unblocked on router"}
            return {"success": False, "message": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.error(f"Bridge resume error: {e}")
        return {"success": False, "message": str(e)}


async def check_subscriber_online(
    tenant_id: str,
    ip_address: str,
    db: AsyncSession = None,
) -> dict:
    """Check if a subscriber's IP is online via the bridge."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"online": False, "error": "No MikroTik config"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{_bridge_url(config)}/subscriber/status?ip={ip_address}",
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return r.json()
            return {"online": False, "error": f"Bridge error {r.status_code}"}
    except Exception as e:
        return {"online": False, "error": str(e)}


async def get_subscriber_queue_stats(
    tenant_id: str,
    ip_address: str,
    db: AsyncSession = None,
) -> dict:
    """Get queue/bandwidth stats for a subscriber from the router."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{_bridge_url(config)}/subscriber/queue?ip={ip_address}",
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return r.json()
            return {"success": False, "message": f"Bridge error {r.status_code}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


async def reconcile_subscribers_from_router(
    tenant_id: str,
    db: AsyncSession = None,
) -> list[dict] | None:
    """Fetch all configured static IP subscribers from the router."""
    config = await _get_config(tenant_id, db)
    if not config:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{_bridge_url(config)}/subscriber/reconcile",
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return r.json().get("subscribers", [])
            return None
    except Exception as e:
        logger.error(f"Bridge reconcile error: {e}")
        return None


async def reconnect_subscriber(
    tenant_id: str,
    subscriber_id: str,
    ip_address: str,
    mac_address: str,
    plan_id: str | None = None,
    db: AsyncSession = None,
) -> dict:
    """Reconnect a subscriber by removing and re-adding on the router."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    payload = {
        "subscriber_id": subscriber_id,
        "ip_address": ip_address,
        "mac_address": mac_address,
        "plan_id": plan_id,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{_bridge_url(config)}/subscriber/reconnect",
                json=payload,
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return {"success": True, "message": "Subscriber reconnected", "data": r.json()}
            return {"success": False, "message": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.error(f"Bridge reconnect error: {e}")
        return {"success": False, "message": str(e)}


async def restart_subscriber(
    tenant_id: str,
    subscriber_id: str,
    ip_address: str,
    db: AsyncSession = None,
) -> dict:
    """Restart a subscriber's connection on the router (reset queue)."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    payload = {
        "subscriber_id": subscriber_id,
        "ip_address": ip_address,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_bridge_url(config)}/subscriber/restart",
                json=payload,
                headers=_bridge_headers(config),
            )
            if r.status_code == 200:
                return {"success": True, "message": "Subscriber connection restarted", "data": r.json()}
            return {"success": False, "message": f"Bridge error {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        logger.error(f"Bridge restart error: {e}")
        return {"success": False, "message": str(e)}
