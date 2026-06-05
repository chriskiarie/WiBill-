"""
app/jobs/session_expiry.py
"""
import logging
from sqlalchemy import select, and_
from datetime import datetime
from app.core.database import AsyncSessionLocal
from app.models.session import Session, SessionStatus
from app.services.mikrotik_service import remove_hotspot_user_by_session

logger = logging.getLogger("honestbill.expiry")


async def expire_sessions():
    """Find expired sessions, remove from MikroTik, mark as expired. Runs every 60s."""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()

            # Compare against string value since column is VARCHAR
            result = await db.execute(
                select(Session).where(
                    and_(
                        Session.status == SessionStatus.ACTIVE.value,
                        Session.expires_at < now,
                    )
                )
            )
            sessions = result.scalars().all()

            if not sessions:
                return

            logger.info(f"Found {len(sessions)} expired session(s)")

            for session in sessions:
                try:
                    removed = await remove_hotspot_user_by_session(
                        session.tenant_id, str(session.id), db
                    )
                    if removed:
                        logger.info(f"Removed MAC={session.mac_address} from MikroTik")

                    # Write string value, not enum object
                    session.status = SessionStatus.EXPIRED.value
                    logger.info(f"Session {session.id} marked EXPIRED")

                except Exception as e:
                    logger.error(f"Error expiring session {session.id}: {e}")

            await db.commit()
            logger.info(f"Expired {len(sessions)} session(s)")

    except Exception as e:
        logger.error(f"expire_sessions job error: {e}")