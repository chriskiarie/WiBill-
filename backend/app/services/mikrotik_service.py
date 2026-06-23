"""
app/services/mikrotik_service.py - MikroTik RouterOS integration
Real librouteros implementation for hotspot user management.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import logging

from librouteros import connect
from librouteros.exceptions import TrapError, MultiTrapError, LibRouterosError, ConnectionClosed
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.mikrotik_config import MikrotikConfig
from app.services.crypto_service import decrypt

logger = logging.getLogger("honestbill.mikrotik")


async def _connect_async(host: str, port: int, username: str, password: str):
    """Run librouteros.connect in thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, lambda: connect(host=host, port=port, username=username, password=password, timeout=10)
    )


def _parse_uptime(uptime_str: str) -> int:
    """Parse RouterOS uptime string like '1d2h30m15s' to seconds."""
    total = 0
    import re
    days = re.search(r'(\d+)d', uptime_str)
    hours = re.search(r'(\d+)h', uptime_str)
    mins = re.search(r'(\d+)m', uptime_str)
    secs = re.search(r'(\d+)s', uptime_str)
    if days:  total += int(days.group(1)) * 86400
    if hours: total += int(hours.group(1)) * 3600
    if mins:  total += int(mins.group(1)) * 60
    if secs:  total += int(secs.group(1))
    return total


async def _get_config(tenant_id: str, db: AsyncSession) -> Optional[MikrotikConfig]:
    """Fetch MikroTik config for a tenant from DB."""
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == uuid.UUID(tenant_id)
        )
    )
    return result.scalar_one_or_none()


async def test_connection(host: str, port: int, username: str, password: str) -> tuple[bool, str, dict]:
    """
    Test connection to MikroTik router and return identity info.
    
    Returns: (success: bool, message: str, info: dict)
    """
    try:
        api = await _connect_async(host, port, username, password)
        identity = list(api('/system/identity/print'))
        resource = list(api('/system/resource/print'))
        name = identity[0].get('name', 'Unknown') if identity else 'Unknown'
        version = resource[0].get('version', 'Unknown') if resource else 'Unknown'
        board = resource[0].get('board-name', 'Unknown') if resource else 'Unknown'
        uptime = resource[0].get('uptime', '0s') if resource else '0s'
        api.close()
        info = {
            "identity": name,
            "version": version,
            "board_name": board,
            "uptime": uptime,
        }
        return True, f"Connected to {name} ({board}) v{version}", info
    except (TrapError, MultiTrapError) as e:
        return False, f"Router error: {e}", {}
    except (LibRouterosError, ConnectionClosed, OSError) as e:
        return False, f"Cannot connect: {e}", {}
    except Exception as e:
        return False, f"Connection failed: {e}", {}


async def get_router_info(host: str, port: int, username: str, password: str) -> dict:
    """Get router identity and system info."""
    try:
        api = await _connect_async(host, port, username, password)
        identity = list(api('/system/identity/print'))
        resource = list(api('/system/resource/print'))
        api.close()
        r = resource[0] if resource else {}
        return {
            "identity": identity[0].get('name', 'Unknown') if identity else 'Unknown',
            "version": r.get('version', 'Unknown'),
            "board_name": r.get('board-name', 'Unknown'),
            "platform": "MikroTik",
            "uptime": r.get('uptime', 'Unknown'),
            "cpu_load": r.get('cpu-load', '0'),
            "free_memory": r.get('free-memory', '0'),
            "total_memory": r.get('total-memory', '0'),
            "free_hdd": r.get('free-hdd-space', '0'),
            "total_hdd": r.get('total-hdd-space', '0'),
        }
    except Exception as e:
        logger.error(f"get_router_info failed: {e}")
        return {}


async def list_interfaces(host: str, port: int, username: str, password: str) -> list:
    """List all network interfaces on the router."""
    try:
        api = await _connect_async(host, port, username, password)
        ifaces = list(api('/interface/print'))
        api.close()
        return [
            {
                "name": i.get('name'),
                "type": i.get('type'),
                "disabled": i.get('disabled') == 'true',
                "running": i.get('running') == 'true',
                "mac_address": i.get('mac-address'),
            }
            for i in ifaces
        ]
    except Exception as e:
        logger.error(f"list_interfaces failed: {e}")
        return []


async def list_hotspot_profiles(host: str, port: int, username: str, password: str) -> list:
    """List hotspot profiles on the router."""
    try:
        api = await _connect_async(host, port, username, password)
        profiles = list(api('/ip/hotspot/profile/print'))
        api.close()
        return [
            {
                "id": p.get('.id'),
                "name": p.get('name'),
                "login_by": p.get('login-by'),
                "use_radius": p.get('use-radius'),
                "html_directory": p.get('html-directory'),
            }
            for p in profiles
        ]
    except Exception as e:
        logger.error(f"list_hotspot_profiles failed: {e}")
        return []


async def list_hotspot_servers(host: str, port: int, username: str, password: str) -> list:
    """List hotspot server interfaces on the router."""
    try:
        api = await _connect_async(host, port, username, password)
        servers = list(api('/ip/hotspot/print'))
        api.close()
        return [
            {
                "id": s.get('.id'),
                "name": s.get('name'),
                "interface": s.get('interface'),
                "profile": s.get('profile'),
                "disabled": s.get('disabled') == 'true',
                "address_pool": s.get('address-pool'),
            }
            for s in servers
        ]
    except Exception as e:
        logger.error(f"list_hotspot_servers failed: {e}")
        return []


async def create_hotspot_user(
    host: str, port: int, username: str, password: str,
    mac_address: str,
    duration_minutes: int,
    session_id: str,
    profile_name: str = "XwB_Profile",
    speed_limit_kbps: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create a hotspot user on the router via librouteros.
    
    Args:
        host, port, username, password: Router connection details
        mac_address: User's device MAC (used as hotspot user name)
        duration_minutes: Session duration in minutes
        session_id: Session UUID (stored in comment for tracking)
        profile_name: Hotspot profile to assign
        speed_limit_kbps: Upload/download speed cap (optional)
    
    Returns:
        {"success": bool, "user_id": str|None, "message": str}
    """
    try:
        api = await _connect_async(host, port, username, password)

        params = {
            "name": mac_address,
            "profile": profile_name,
            "comment": f"session:{session_id}",
            "limit-uptime": f"{duration_minutes}m",
            "disabled": "no",
        }

        if speed_limit_kbps:
            params["rate-limit"] = f"{speed_limit_kbps}k/{speed_limit_kbps}k"

        result = list(api('/ip/hotspot/user/add', **params))
        api.close()

        user_id = result[0].get('.id') if result else None

        logger.info(f"MikroTik user created: {mac_address} ({duration_minutes}m) -> {user_id}")
        return {
            "success": True,
            "user_id": user_id,
            "username": mac_address,
            "message": f"User {mac_address} created with {duration_minutes}m access",
        }

    except TrapError as e:
        msg = str(e)
        if "already exist" in msg.lower():
            return {
                "success": False,
                "user_id": None,
                "message": f"User {mac_address} already exists on router",
            }
        logger.error(f"MikroTik TrapError creating user {mac_address}: {e}")
        return {"success": False, "user_id": None, "message": f"Router error: {e}"}
    except Exception as e:
        logger.error(f"create_hotspot_user failed for {mac_address}: {e}")
        return {"success": False, "user_id": None, "message": str(e)}


async def remove_hotspot_user_by_mac(
    host: str, port: int, username: str, password: str,
    mac_address: str,
) -> Dict[str, Any]:
    """
    Remove a hotspot user by their MAC address.
    Also removes any active connection for that MAC.
    """
    try:
        api = await _connect_async(host, port, username, password)

        # Remove active connection if exists
        active_list = list(api('/ip/hotspot/active/print', **{'?user': mac_address}))
        for active in active_list:
            api('/ip/hotspot/active/remove', **{'.id': active['.id']})

        # Remove user from hotspot user list
        user_list = list(api('/ip/hotspot/user/print', **{'?name': mac_address}))
        removed = False
        for user in user_list:
            api('/ip/hotspot/user/remove', **{'.id': user['.id']})
            removed = True

        api.close()
        if removed:
            logger.info(f"MikroTik user removed: {mac_address}")
            return {"success": True, "message": f"User {mac_address} removed"}
        return {"success": True, "message": f"User {mac_address} not found (already removed)"}

    except Exception as e:
        logger.error(f"remove_hotspot_user_by_mac failed: {e}")
        return {"success": False, "message": str(e)}


async def remove_hotspot_user_by_session(
    host: str, port: int, username: str, password: str,
    session_id: str,
) -> Dict[str, Any]:
    """
    Remove hotspot user by session comment on the router.
    Called by session_expiry job when a session expires.
    """
    try:
        api = await _connect_async(host, port, username, password)

        # Find users whose comment contains this session ID
        user_list = list(api('/ip/hotspot/user/print', **{'?comment': f"session:{session_id}"}))
        for user in user_list:
            mac = user.get('name', 'unknown')
            # Remove active session
            active_list = list(api('/ip/hotspot/active/print', **{'?user': mac}))
            for active in active_list:
                api('/ip/hotspot/active/remove', **{'.id': active['.id']})
            # Remove user
            api('/ip/hotspot/user/remove', **{'.id': user['.id']})
            logger.info(f"Removed {mac} (session {session_id}) from MikroTik")

        api.close()
        return {"success": True, "message": f"Session {session_id} removed from router"}

    except Exception as e:
        logger.error(f"remove_hotspot_user_by_session failed: {e}")
        return {"success": False, "message": str(e)}


async def get_active_users(
    host: str, port: int, username: str, password: str,
) -> list:
    """Get list of currently active hotspot users from the router."""
    try:
        api = await _connect_async(host, port, username, password)
        active = list(api('/ip/hotspot/active/print'))
        users = list(api('/ip/hotspot/user/print'))
        api.close()

        user_map = {}
        for u in users:
            user_map[u.get('name')] = u

        return [
            {
                "user": a.get('user'),
                "mac_address": a.get('mac-address'),
                "address": a.get('address'),
                "uptime": a.get('uptime'),
                "session_time_left": a.get('session-time-left'),
                "idle_time": a.get('idle-time'),
                "bytes_in": int(a.get('bytes-in', 0)),
                "bytes_out": int(a.get('bytes-out', 0)),
                "packets_in": int(a.get('packets-in', 0)),
                "packets_out": int(a.get('packets-out', 0)),
                "profile": user_map.get(a.get('user'), {}).get('profile', 'default'),
                "comment": user_map.get(a.get('user'), {}).get('comment', ''),
                "limit_uptime": user_map.get(a.get('user'), {}).get('limit-uptime', ''),
            }
            for a in active
        ]
    except Exception as e:
        logger.warning(f"get_active_users failed: {e}")
        return []


async def get_router_stats(
    host: str, port: int, username: str, password: str,
) -> Dict[str, Any]:
    """Get router health statistics."""
    try:
        api = await _connect_async(host, port, username, password)
        resource = list(api('/system/resource/print'))
        active = list(api('/ip/hotspot/active/print'))
        identity = list(api('/system/identity/print'))
        api.close()

        r = resource[0] if resource else {}
        total_mem = int(r.get('total-memory', 0))
        free_mem = int(r.get('free-memory', 0))
        used_mem = total_mem - free_mem
        mem_pct = round((used_mem / total_mem) * 100, 1) if total_mem else 0

        return {
            "identity": identity[0].get('name', 'Unknown') if identity else 'Unknown',
            "cpu_load": int(r.get('cpu-load', 0)),
            "memory_usage_pct": mem_pct,
            "free_memory_bytes": free_mem,
            "total_memory_bytes": total_mem,
            "uptime": r.get('uptime', 'Unknown'),
            "uptime_seconds": _parse_uptime(r.get('uptime', '0s')),
            "version": r.get('version', 'Unknown'),
            "board_name": r.get('board-name', 'Unknown'),
            "active_users_count": len(active),
        }
    except Exception as e:
        logger.warning(f"get_router_stats failed: {e}")
        return {}


# ── Tenant-aware wrappers (read config from DB) ──────────────────────────

async def create_mikrotik_user(
    tenant_id: str | uuid.UUID,
    session_id: str,
    mac_address: str,
    ip_address: str,
    username: str,
    password: str,
    expires_at: datetime,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Create a hotspot user on the MikroTik router using the tenant's saved config.
    Reads MikrotikConfig from DB by tenant_id.

    This is the DB-aware wrapper used by sessions.py (manual activate endpoint).
    The M-Pesa callback path uses create_hotspot_user() directly in _handle_session_paid().
    """
    config = await _get_config(str(tenant_id) if not isinstance(tenant_id, str) else tenant_id, db)
    if not config:
        logger.warning(f"No MikroTik config for tenant {tenant_id} — cannot provision router")
        return {"success": False, "message": "MikroTik not configured for this ISP", "user_id": None}

    # Compute duration in minutes from expires_at
    remaining = (expires_at - datetime.utcnow()).total_seconds()
    duration_minutes = max(1, int(remaining / 60))

    try:
        api = await _connect_async(
            host=config.router_ip,
            port=config.api_port,
            username=config.api_username,
            password=decrypt(config.api_password_enc),
        )

        params = {
            "=name": username,
            "=password": password,
            "=mac-address": mac_address.upper(),
            "=profile": config.hotspot_profile_name or "XwB_Profile",
            "=comment": f"wibill-{session_id[:8]}",
            "=limit-uptime": f"{duration_minutes}m",
            "=disabled": "no",
        }

        result = list(api("/ip/hotspot/user/add", **params))
        api.close()

        router_id = result[0].get(".id") if result else None
        logger.info(f"MikroTik user {username} created for session {session_id[:8]}, id={router_id}")
        return {"success": True, "user_id": router_id, "username": username, "message": "User created on router"}
    except TrapError as e:
        msg = str(e).lower()
        if "already exist" in msg or "already have such entry" in msg:
            logger.info(f"User {username} already exists on router (session {session_id[:8]})")
            return {"success": True, "user_id": None, "message": "User already exists"}
        logger.error(f"TrapError creating {username}: {e}")
        return {"success": False, "user_id": None, "message": f"Router error: {e}"}
    except Exception as e:
        logger.error(f"create_mikrotik_user failed for {username}: {e}")
        return {"success": False, "user_id": None, "message": str(e)}
