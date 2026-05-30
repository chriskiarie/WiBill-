import logging
from sqlalchemy import select, and_
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.models.session import Session, SessionStatus
from app.services.session_service import expire_old_sessions
from app.services.mikrotik_service import remove_hotspot_user_by_session
 
logger = logging.getLogger("honestbill.expiry")
 
 
async def expire_sessions():
    """
    Find expired sessions, remove from MikroTik, mark as expired.
    Runs every 60s.
    """
    async with AsyncSessionLocal() as db:
        # Get sessions that expired but still marked ACTIVE
        now = datetime.utcnow()  # naive UTC matches TIMESTAMP WITHOUT TIME ZONE column
        result = await db.execute(
            select(Session).where(
                and_(
                    Session.status == SessionStatus.ACTIVE,
                    Session.expires_at < now,
                )
            )
        )
        sessions = result.scalars().all()
 
        if not sessions:
            return
 
        logger.info(f"Found {len(sessions)} expired session(s) to clean up")
 
        for session in sessions:
            try:
                # Remove from MikroTik first
                removed = await remove_hotspot_user_by_session(
                    session.tenant_id, str(session.id), db
                )
                if removed:
                    logger.info(f"Removed MAC={session.mac_address} from MikroTik")
 
                # Mark as expired in DB
                session.status = SessionStatus.EXPIRED
                logger.info(f"Session {session.id} marked EXPIRED")
 
            except Exception as e:
                logger.error(f"Error expiring session {session.id}: {e}")
 
        await db.commit()
        logger.info(f"Expired {len(sessions)} session(s)")