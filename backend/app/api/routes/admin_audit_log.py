"""
Audit Log - read-only view of admin actions.
"""
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.audit_log import AuditLog
from app.api.routes.auth import get_current_user, require_platform_admin

router = APIRouter(tags=["admin-audit-log"])

class AuditLogResponse(BaseModel):
    id: str
    actor_email: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: str

    class Config:
        from_attributes = True

@router.get("/admin/audit-logs")
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [
        AuditLogResponse(
            id=str(l.id),
            actor_email=l.actor_email,
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            details=l.details,
            created_at=l.created_at.isoformat() if l.created_at else ""
        )
        for l in logs
    ]

@router.get("/admin/audit-logs/count")
async def audit_log_count(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func
    result = await db.execute(select(func.count(AuditLog.id)))
    return {"count": result.scalar()}
