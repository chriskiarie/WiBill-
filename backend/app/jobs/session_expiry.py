"""
app/jobs/session_expiry.py
Finds expired sessions, removes hotspot users from MikroTik, marks sessions expired.
Also removes ip-binding bypass entries for expired devices.
Runs every 60s via APScheduler.
"""
import logging
from sqlalchemy import select, and_
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.models.session import Session, SessionStatus
from app.services.mikrotik_service import remove_hotspot_user_by_session, remove_hotspot_bypass

logger = logging.getLogger("honestbill.expiry")


async def expire_sessions():
    """Find expired sessions, remove from MikroTik, mark as expired. Runs every 60s."""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()

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
                    # Remove user from MikroTik via bridge
                    removed = await remove_hotspot_user_by_session(
                        tenant_id=str(session.tenant_id),
                        session_id=str(session.id),
                        db=db,
                    )
                    if removed.get("success"):
                        logger.info(f"Removed session {session.id} from MikroTik")
                    else:
                        logger.warning(f"MikroTik removal failed for session {session.id}: {removed.get('message')}")

                    # Remove bypass entry if no other active sessions for this MAC
                    if session.mac_address:
                        other_active = await db.execute(
                            select(Session).where(
                                and_(
                                    Session.tenant_id == session.tenant_id,
                                    Session.mac_address == session.mac_address,
                                    Session.status == SessionStatus.ACTIVE.value,
                                    Session.id != session.id,
                                )
                            )
                        )
                        if not other_active.scalars().first():
                            await remove_hotspot_bypass(
                                tenant_id=str(session.tenant_id),
                                mac_address=session.mac_address,
                                db=db,
                            )

                    session.status = SessionStatus.EXPIRED.value
                    logger.info(f"Session {session.id} marked EXPIRED")

                except Exception as e:
                    logger.error(f"Error expiring session {session.id}: {e}")

            await db.commit()
            logger.info(f"Expired {len(sessions)} session(s)")

    except Exception as e:
        logger.error(f"expire_sessions job error: {e}")
