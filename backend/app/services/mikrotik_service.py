"""
MikroTik RouterOS API service.
Handles: add hotspot user, remove hotspot user, network check.
Works with any RouterOS device (hAP lite, hEX, RB4011, CCR, etc.)
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import librouteros
from librouteros import connect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.mikrotik_config import MikrotikConfig
from app.models.network_event import NetworkEvent, NetworkStatus
from app.models.session import Session, SessionStatus
from app.services.crypto_service import decrypt

logger = logging.getLogger("honestbill")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_mikrotik_config(tenant_id, db: AsyncSession) -> Optional[MikrotikConfig]:
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


def _make_connection(cfg: MikrotikConfig):
    """Open a synchronous librouteros connection (runs in thread pool)."""
    password = decrypt(cfg.password_encrypted)
    return connect(
        host=cfg.router_ip,
        username=cfg.username,
        password=password,
        port=cfg.api_port or 8728,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def add_hotspot_user(
    tenant_id,
    mac_address: str,
    phone_number: str,
    duration_hours: int,
    session_id: str,
    db: AsyncSession,
) -> bool:
    """
    Add a hotspot user to MikroTik. Returns True on success.
    Username = sanitised MAC (colons stripped).
    Comment = session_id so we can find and remove it later.
    """
    cfg = await _get_mikrotik_config(tenant_id, db)
    if not cfg:
        logger.error(f"[MikroTik] No config for tenant {tenant_id}")
        return False

    username = mac_address.replace(":", "").lower()
    profile = cfg.hotspot_profile or "default"

    def _add():
        api = _make_connection(cfg)
        try:
            # Remove stale entry for this MAC if it exists
            users = api.path("ip", "hotspot", "user")
            existing = [u for u in users if u.get("name") == username]
            for u in existing:
                users.remove(u[".id"])

            # Add fresh user
            users.add(
                name=username,
                password=phone_number[-4:],   # last 4 digits of phone as pin
                profile=profile,
                comment=session_id,
                **{"limit-uptime": f"{duration_hours}h"},
            )
            logger.info(f"[MikroTik] Added user {username} profile={profile} duration={duration_hours}h")
            return True
        except Exception as e:
            logger.error(f"[MikroTik] add_hotspot_user failed: {e}")
            return False
        finally:
            api.close()

    return await asyncio.get_event_loop().run_in_executor(None, _add)


async def remove_hotspot_user(
    tenant_id,
    mac_address: str,
    db: AsyncSession,
) -> bool:
    """Remove a hotspot user by MAC address."""
    cfg = await _get_mikrotik_config(tenant_id, db)
    if not cfg:
        return False

    username = mac_address.replace(":", "").lower()

    def _remove():
        api = _make_connection(cfg)
        try:
            users = api.path("ip", "hotspot", "user")
            existing = [u for u in users if u.get("name") == username]
            for u in existing:
                users.remove(u[".id"])
            # Also kick any active session
            active = api.path("ip", "hotspot", "active")
            for a in active:
                if a.get("mac-address", "").replace(":", "").lower() == username:
                    active.remove(a[".id"])
            logger.info(f"[MikroTik] Removed user {username}")
            return True
        except Exception as e:
            logger.error(f"[MikroTik] remove_hotspot_user failed: {e}")
            return False
        finally:
            api.close()

    return await asyncio.get_event_loop().run_in_executor(None, _remove)


async def remove_hotspot_user_by_session(
    session: Session,
    db: AsyncSession,
) -> bool:
    """
    Remove a hotspot user given a Session ORM object.
    Called by the session expiry job.
    """
    if not session.mac_address:
        return False
    return await remove_hotspot_user(session.tenant_id, session.mac_address, db)


async def check_tenant_network(tenant_id, router_ip: str, db: AsyncSession) -> NetworkStatus:
    """
    Ping the router IP. Record a NetworkEvent. Return current status.
    """
    import subprocess, platform

    param = "-n" if platform.system().lower() == "windows" else "-c"
    cmd = ["ping", param, "1", "-w", "2000" if platform.system().lower() == "windows" else "2", router_ip]

    try:
        result = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(result.communicate(), timeout=5)
        status = NetworkStatus.up if result.returncode == 0 else NetworkStatus.down
    except Exception:
        status = NetworkStatus.down

    event = NetworkEvent(
        tenant_id=tenant_id,
        status=status,
        checked_at=datetime.now(timezone.utc),
        router_ip=router_ip,
    )
    db.add(event)
    await db.commit()

    logger.info(f"[Network] tenant={tenant_id} router={router_ip} status={status.value}")
    return status


async def get_current_status(tenant_id) -> dict:
    """Return the most recent network event for a tenant."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(NetworkEvent)
            .where(NetworkEvent.tenant_id == tenant_id)
            .order_by(NetworkEvent.checked_at.desc())
            .limit(1)
        )
        event = result.scalar_one_or_none()
        if not event:
            return {"status": "unknown", "checked_at": None}
        return {
            "status": event.status.value,
            "checked_at": event.checked_at.isoformat(),
        }
