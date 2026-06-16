"""
app/jobs/session_expiry.py
Finds expired sessions, removes hotspot users from MikroTik, marks sessions expired.
Runs every 60s via APScheduler.
"""
import logging
from sqlalchemy import select, and_
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.models.session import Session, SessionStatus
from app.models.mikrotik_config import MikrotikConfig
from app.models.mikrotik_active_user import MikrotikActiveUser
from app.services.mikrotik_service import remove_hotspot_user_by_session
from app.services.crypto_service import decrypt

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
                    # Fetch router config for this tenant
                    mk_result = await db.execute(
                        select(MikrotikConfig).where(
                            MikrotikConfig.tenant_id == session.tenant_id
                        )
                    )
                    mk_cfg = mk_result.scalar_one_or_none()

                    if mk_cfg:
                        api_password = decrypt(mk_cfg.api_password_enc)
                        removed = await remove_hotspot_user_by_session(
                            host=mk_cfg.router_ip,
                            port=mk_cfg.api_port,
                            username=mk_cfg.api_username,
                            password=api_password,
                            session_id=str(session.id),
                        )
                        if removed.get("success"):
                            logger.info(f"Removed session {session.id} from MikroTik")
                        else:
                            logger.warning(f"MikroTik removal failed for session {session.id}: {removed.get('message')}")

                    session.status = SessionStatus.EXPIRED.value
                    logger.info(f"Session {session.id} marked EXPIRED")

                except Exception as e:
                    logger.error(f"Error expiring session {session.id}: {e}")

            await db.commit()
            logger.info(f"Expired {len(sessions)} session(s)")

    except Exception as e:
        logger.error(f"expire_sessions job error: {e}")
