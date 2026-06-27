"""
MikroTik RouterOS integration via librouteros.
Runs synchronous librouteros calls in asyncio thread executor.
RouterOS v6 compatible (your hAP lite runs v6.49.18).
"""
import asyncio
import uuid
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import librouteros
from librouteros import connect
from librouteros.exceptions import TrapError, FatalError

from app.models.mikrotik_config import MikrotikConfig
from app.services.crypto_service import decrypt

logger = logging.getLogger("wibill.mikrotik")


async def _get_config(tenant_id: str, db: AsyncSession) -> Optional[MikrotikConfig]:
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == uuid.UUID(tenant_id))
    )
    return result.scalar_one_or_none()


def _open(config: MikrotikConfig):
    """Open synchronous librouteros connection."""
    return connect(
        host=config.router_ip,
        username=config.api_username,
        password=decrypt(config.api_password_enc),
        port=config.api_port,
        timeout=10,
    )


def _duration_str(expires_at: datetime) -> str:
    """Convert expiry datetime to RouterOS HH:MM:SS limit-uptime string."""
    delta = expires_at - datetime.utcnow()
    total = max(int(delta.total_seconds()), 60)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


async def check_mikrotik_connection(tenant_id: str, db: AsyncSession) -> dict:
    config = await _get_config(tenant_id, db)
    if not config:
        return {"connected": False, "error": "No MikroTik config saved for this ISP"}

    def _test():
        api = _open(config)
        resources = list(api("/system/resource/print"))
        identity = list(api("/system/identity/print"))
        hotspots = list(api("/ip/hotspot/print"))
        api.close()
        return resources, identity, hotspots

    try:
        resources, identity, hotspots = await asyncio.get_event_loop().run_in_executor(None, _test)
        r = resources[0] if resources else {}
        hotspot_names = [h.get("name") for h in hotspots]
        return {
            "connected": True,
            "router_identity": identity[0].get("name", "Unknown") if identity else "Unknown",
            "router_os_version": r.get("version", "Unknown"),
            "board_name": r.get("board-name", "Unknown"),
            "uptime": r.get("uptime", "Unknown"),
            "cpu_load": f"{r.get('cpu-load', '?')}%",
            "free_memory_mb": round(int(r.get("free-memory", 0)) / 1024 / 1024, 1),
            "hotspot_server": config.hotspot_server,
            "hotspot_found": config.hotspot_server in hotspot_names,
            "available_hotspots": hotspot_names,
            "router_ip": config.router_ip,
        }
    except FatalError as e:
        return {"connected": False, "error": f"Authentication failed — check username/password: {e}"}
    except OSError as e:
        return {"connected": False, "error": f"Cannot reach {config.router_ip}:{config.api_port} — check tunnel: {e}"}
    except TrapError as e:
        return {"connected": False, "error": f"RouterOS error: {e}"}
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

    limit_uptime = _duration_str(expires_at)

    def _create():
        api = _open(config)
        try:
            result = list(api(
                "/ip/hotspot/user/add",
                **{
                    "=server": config.hotspot_server,
                    "=name": username,
                    "=password": password,
                    "=mac-address": mac_address.upper(),
                    "=limit-uptime": limit_uptime,
                    "=comment": f"wibill-{session_id[:8]}",
                }
            ))
            api.close()
            return {"ok": True, "router_id": result[0] if result else None}
        except TrapError as e:
            api.close()
            if "already have such entry" in str(e).lower():
                return {"ok": True, "router_id": None, "note": "already existed"}
            raise

    try:
        result = await asyncio.get_event_loop().run_in_executor(None, _create)
        logger.info(f"MikroTik user '{username}' created on {config.router_ip}, expires in {limit_uptime}")
        return {
            "success": True,
            "message": f"Hotspot user '{username}' created on {config.router_ip}",
            "user_id": result.get("router_id"),
            "limit_uptime": limit_uptime,
        }
    except TrapError as e:
        logger.error(f"RouterOS trap creating user: {e}")
        return {"success": False, "message": f"RouterOS error: {e}", "user_id": None}
    except Exception as e:
        logger.error(f"Error creating MikroTik user: {e}")
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

    def _remove():
        api = _open(config)
        users = list(api("/ip/hotspot/user/print", **{"?name": username}))
        removed = False
        if users:
            list(api("/ip/hotspot/user/remove", **{"=.id": users[0][".id"]}))
            removed = True
        # Also kick active session
        active = list(api("/ip/hotspot/active/print", **{"?user": username}))
        for a in active:
            try:
                list(api("/ip/hotspot/active/remove", **{"=.id": a[".id"]}))
            except Exception:
                pass
        api.close()
        return {"removed": removed, "kicked": len(active)}

    try:
        r = await asyncio.get_event_loop().run_in_executor(None, _remove)
        logger.info(f"MikroTik user '{username}' removed, kicked {r['kicked']} active sessions")
        return {"success": True, "message": f"Removed '{username}', kicked {r['kicked']} active session(s)"}
    except Exception as e:
        logger.error(f"Error removing MikroTik user: {e}")
        return {"success": False, "message": str(e)}


async def remove_hotspot_user_by_session(
    tenant_id: str,
    session_id: str,
    db: AsyncSession,
) -> dict:
    """Fallback: remove by comment tag when username unavailable."""
    config = await _get_config(tenant_id, db)
    if not config:
        return {"success": False, "message": "No MikroTik config"}

    tag = f"wibill-{session_id[:8]}"

    def _remove_by_tag():
        api = _open(config)
        users = list(api("/ip/hotspot/user/print"))
        removed = 0
        for u in users:
            if u.get("comment", "") == tag:
                try:
                    list(api("/ip/hotspot/user/remove", **{"=.id": u[".id"]}))
                    removed += 1
                except Exception:
                    pass
        api.close()
        return removed

    try:
        count = await asyncio.get_event_loop().run_in_executor(None, _remove_by_tag)
        return {"success": True, "message": f"Removed {count} user(s) by session tag"}
    except Exception as e:
        return {"success": False, "message": str(e)}


async def get_active_users(tenant_id: str, db: AsyncSession) -> list:
    config = await _get_config(tenant_id, db)
    if not config:
        return []

    def _get():
        api = _open(config)
        active = list(api("/ip/hotspot/active/print"))
        api.close()
        return active

    try:
        return await asyncio.get_event_loop().run_in_executor(None, _get)
    except Exception:
        return []
