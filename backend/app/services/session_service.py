import random
import string
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.session import Session, SessionStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.package import Package
from app.core.config import settings

logger = logging.getLogger("honestbill.session")


def generate_reconnect_code() -> str:
    """Generate a short unique reconnect code like WB-4X9K."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=4))
    return f"WB-{suffix}"


async def create_pending_session(
    tenant_id,
    package_id,
    mac_address: str,
    ip_address: str,
    phone_number: str,
    db: AsyncSession,
) -> Session:
    """
    Create a PENDING session when user initiates payment.
    STK Push fires after this.
    """
    # Clean up any existing pending sessions for this MAC
    existing = await db.execute(
        select(Session).where(
            and_(
                Session.tenant_id == tenant_id,
                Session.mac_address == mac_address,
                Session.status == SessionStatus.PENDING,
            )
        )
    )
    for old in existing.scalars().all():
        old.status = SessionStatus.FAILED
        logger.info(f"Cancelled stale pending session {old.id} for MAC {mac_address}")

    session = Session(
        tenant_id=tenant_id,
        package_id=package_id,
        mac_address=mac_address.upper(),
        ip_address=ip_address,
        phone_number=phone_number,
        status=SessionStatus.PENDING,
    )
    db.add(session)
    await db.flush()  # get session.id
    return session


async def activate_session(
    session: Session,
    package: Package,
    mpesa_receipt: str,
    amount_paid: float,
    db: AsyncSession,
) -> Session:
    """
    Called after payment confirmed. Activates session, records transaction.
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=package.duration_hours)

    # Generate reconnect code — ensure uniqueness
    for _ in range(10):
        code = generate_reconnect_code()
        existing = await db.execute(
            select(Session).where(Session.reconnect_code == code)
        )
        if not existing.scalar_one_or_none():
            break

    session.status = SessionStatus.ACTIVE
    session.started_at = now
    session.expires_at = expires
    session.reconnect_code = code
    session.last_seen_at = now

    # Record transaction with fee split
    commission = float(settings.DEFAULT_COMMISSION_RATE)
    platform_fee = round(amount_paid * commission, 2)
    isp_earnings = round(amount_paid - platform_fee, 2)

    transaction = Transaction(
        tenant_id=session.tenant_id,
        session_id=session.id,
        phone_number=session.phone_number,
        amount_ksh=amount_paid,
        platform_fee_ksh=platform_fee,
        isp_earnings_ksh=isp_earnings,
        mpesa_receipt=mpesa_receipt,
        status=TransactionStatus.SUCCESS,
        confirmed_at=now,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(session)

    logger.info(
        f"Session {session.id} ACTIVATED | MAC={session.mac_address} | "
        f"code={code} | expires={expires.isoformat()} | "
        f"receipt={mpesa_receipt} | fee={platform_fee} | isp={isp_earnings}"
    )
    return session


async def get_active_session_by_mac(
    tenant_id,
    mac_address: str,
    db: AsyncSession,
) -> Session | None:
    """
    Check if a MAC address has an active session.
    Used on portal load for reconnect flow.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Session).where(
            and_(
                Session.tenant_id == tenant_id,
                Session.mac_address == mac_address.upper(),
                Session.status == SessionStatus.ACTIVE,
                Session.expires_at > now,
            )
        )
    )
    session = result.scalar_one_or_none()
    if session:
        # Update last_seen_at
        session.last_seen_at = now
        await db.commit()
    return session


async def get_session_by_reconnect_code(
    code: str,
    db: AsyncSession,
) -> Session | None:
    """Get session by reconnect code for manual reconnection."""
    result = await db.execute(
        select(Session).where(Session.reconnect_code == code.upper())
    )
    return result.scalar_one_or_none()


async def get_session_status(session_id, db: AsyncSession) -> dict:
    """
    Poll endpoint response. Returns status dict for portal polling.
    """
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        return {"status": "not_found"}

    now = datetime.now(timezone.utc)
    time_remaining = None

    if session.status == SessionStatus.ACTIVE and session.expires_at:
        expires = session.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        delta = expires - now
        time_remaining = max(0, int(delta.total_seconds()))

    # Check for STK timeout
    if session.status == SessionStatus.PENDING:
        created = session.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (now - created).total_seconds()
        if elapsed > settings.STK_PUSH_TIMEOUT_SECONDS:
            session.status = SessionStatus.FAILED
            await db.commit()
            return {"status": "failed", "reason": "Payment timed out"}

    return {
        "status": session.status.value,
        "reconnect_code": session.reconnect_code if session.status == SessionStatus.ACTIVE else None,
        "time_remaining_seconds": time_remaining,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
    }


async def expire_old_sessions(db: AsyncSession) -> int:
    """
    Find and expire sessions past their expiry time.
    Called by APScheduler every 60s.
    Returns count of expired sessions.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Session).where(
            and_(
                Session.status == SessionStatus.ACTIVE,
                Session.expires_at < now,
            )
        )
    )
    sessions = result.scalars().all()

    expired_count = 0
    for session in sessions:
        session.status = SessionStatus.EXPIRED
        expired_count += 1
        logger.info(f"Session {session.id} expired | MAC={session.mac_address}")

    if expired_count:
        await db.commit()

    return expired_count