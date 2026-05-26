from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
 
from app.core.database import get_db
from app.api.routes.auth import get_current_user, require_isp_admin
from app.models.admin_user import AdminUser
from app.models.session import Session, SessionStatus
from app.services.session_service import get_session_status, get_active_session_by_mac
 
router = APIRouter()
 
 
@router.get("/{session_id}/status")
async def session_status(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll endpoint — portal checks this every 3 seconds waiting for payment."""
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    return await get_session_status(sid, db)
 
 
@router.get("/")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """ISP admin: list their active sessions."""
    tenant_id = current_user.tenant_id
    result = await db.execute(
        select(Session)
        .where(Session.tenant_id == tenant_id, Session.status == SessionStatus.ACTIVE)
        .order_by(Session.started_at.desc())
        .limit(100)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "mac_address": s.mac_address,
            "phone_number": s.phone_number,
            "status": s.status.value,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "reconnect_code": s.reconnect_code,
        }
        for s in sessions
    ]