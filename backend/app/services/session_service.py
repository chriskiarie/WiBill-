"""
app/services/session_service.py - Session management service
Handles: creation, expiration, MikroTik integration
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from uuid import uuid4
import secrets
import re

from app.models.session import Session as DBSession
from app.models.tenant import Tenant


async def create_session(
    tenant_id: str,
    mac_address: str,
    ip_address: str,
    package_id: str | None,
    expires_at: datetime,
    db: AsyncSession
) -> DBSession:
    """
    Create a new session
    
    Args:
        tenant_id: ISP tenant UUID
        mac_address: User's device MAC address
        ip_address: User's IP address
        package_id: Internet package UUID
        expires_at: When session should expire
        db: Database session
    
    Returns:
        Created DBSession object
    
    Raises:
        ValueError: If MAC/IP format invalid
    """
    
    # Validate inputs
    if not _is_valid_mac(mac_address):
        raise ValueError(f"Invalid MAC address format: {mac_address}")
    
    if not _is_valid_ip(ip_address):
        raise ValueError(f"Invalid IP address format: {ip_address}")
    
    # Check for existing active session with same MAC
    existing = await db.execute(
        select(DBSession).where(
            DBSession.mac_address == mac_address,
            DBSession.tenant_id == tenant_id,
            DBSession.status.in_(["pending_payment", "active"])
        )
    )
    
    if existing.scalar_one_or_none():
        raise ValueError(f"Device {mac_address} already has an active session")
    
    # Generate unique reconnect code
    reconnect_code = _generate_reconnect_code()
    
    # Create session
    session = DBSession(
        id=uuid4(),
        tenant_id=tenant_id,
        package_id=package_id,
        mac_address=mac_address.upper(),
        ip_address=ip_address,
        status="pending_payment",
        reconnect_code=reconnect_code,
        expires_at=expires_at,
        created_at=datetime.utcnow()
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


# Alias for backwards compatibility with existing mpesa.py
async def create_pending_session(
    tenant_id: str,
    mac_address: str,
    ip_address: str,
    package_id: str,
    expires_at: datetime,
    db: AsyncSession
) -> DBSession:
    """
    Create a pending session (alias for create_session)
    """
    return await create_session(
        tenant_id=tenant_id,
        mac_address=mac_address,
        ip_address=ip_address,
        package_id=package_id,
        expires_at=expires_at,
        db=db
    )


async def activate_session(
    session_id: str,
    mikrotik_user_id: str = None,
    db: AsyncSession = None
) -> DBSession:
    """
    Mark session as active after MikroTik user creation
    
    Args:
        session_id: Session UUID
        mikrotik_user_id: User ID from MikroTik API (optional)
        db: Database session
    
    Returns:
        Updated session
    """
    
    if db is None:
        raise ValueError("Database session required")
    
    stmt = update(DBSession).where(
        DBSession.id == session_id
    ).values(
        status="active",
        mikrotik_user_id=mikrotik_user_id,
        activated_at=datetime.utcnow()
    )
    
    await db.execute(stmt)
    await db.commit()
    
    # Fetch updated session
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    return result.scalar_one()


async def expire_session(
    session_id: str,
    db: AsyncSession
) -> DBSession:
    """
    Mark session as expired
    Called by scheduler job on expiry
    
    Args:
        session_id: Session UUID
        db: Database session
    
    Returns:
        Updated session
    """
    
    stmt = update(DBSession).where(
        DBSession.id == session_id
    ).values(
        status="expired",
        disconnected_at=datetime.utcnow()
    )
    
    await db.execute(stmt)
    await db.commit()
    
    # Fetch updated session
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    return result.scalar_one()


async def update_last_seen(
    session_id: str,
    db: AsyncSession
) -> None:
    """
    Update last activity timestamp (called on network activity)
    """
    
    stmt = update(DBSession).where(
        DBSession.id == session_id
    ).values(
        last_seen_at=datetime.utcnow()
    )
    
    await db.execute(stmt)
    await db.commit()


async def get_active_sessions(
    tenant_id: str,
    db: AsyncSession
) -> list:
    """
    Get all active sessions for a tenant
    """
    
    result = await db.execute(
        select(DBSession).where(
            DBSession.tenant_id == tenant_id,
            DBSession.status == "active",
            DBSession.expires_at > datetime.utcnow()
        )
    )
    
    return result.scalars().all()


async def get_expired_sessions(
    tenant_id: str,
    db: AsyncSession
) -> list:
    """
    Get all sessions that have expired
    """
    
    result = await db.execute(
        select(DBSession).where(
            DBSession.tenant_id == tenant_id,
            DBSession.status == "active",
            DBSession.expires_at <= datetime.utcnow()
        )
    )
    
    return result.scalars().all()


async def get_session_by_id(
    session_id: str,
    db: AsyncSession
) -> DBSession:
    """
    Get session by UUID
    """
    result = await db.execute(
        select(DBSession).where(DBSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_session_by_mac(
    tenant_id: str,
    mac_address: str,
    db: AsyncSession
) -> DBSession:
    """
    Get active session by MAC address for a tenant
    """
    result = await db.execute(
        select(DBSession).where(
            DBSession.tenant_id == tenant_id,
            DBSession.mac_address == mac_address.upper(),
            DBSession.status.in_(["pending_payment", "active"])
        )
    )
    return result.scalar_one_or_none()


async def expire_old_sessions(
    db: AsyncSession
) -> int:
    """
    Expire all sessions that have passed their expiry time
    Called by scheduler job every minute
    
    Returns:
        Number of sessions expired
    """
    
    now = datetime.utcnow()
    
    # Find all active sessions that have expired
    result = await db.execute(
        select(DBSession).where(
            DBSession.status == "active",
            DBSession.expires_at <= now
        )
    )
    
    expired_sessions = result.scalars().all()
    count = 0
    
    for session in expired_sessions:
        stmt = update(DBSession).where(
            DBSession.id == session.id
        ).values(
            status="expired",
            disconnected_at=now
        )
        await db.execute(stmt)
        count += 1
    
    if count > 0:
        await db.commit()
    
    return count


def _is_valid_mac(mac: str) -> bool:
    """Validate MAC address format"""
    if mac == "00:00:00:00:00:00":
        return True
    # Accept: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
    pattern = r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
    return bool(re.match(pattern, mac))


def _is_valid_ip(ip: str) -> bool:
    """Validate IPv4 address format"""
    pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    if not re.match(pattern, ip):
        return False
    
    # Check octets are 0-255
    parts = ip.split('.')
    return all(0 <= int(p) <= 255 for p in parts)


def _generate_reconnect_code(length: int = 16) -> str:
    """
    Generate unique reconnect code
    Format: wifi_XXXXXXXXXX (alphanumeric, lowercase)
    """
    random_part = secrets.token_hex(length // 2)
    return f"wifi_{random_part}".lower()