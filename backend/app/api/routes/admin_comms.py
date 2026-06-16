"""
Comms - platform admin can send broadcast/direct notifications to ISPs.
"""
from typing import List, Optional
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.notification import Notification
from app.api.routes.auth import get_current_user, require_platform_admin, require_isp_admin

router = APIRouter(tags=["admin-comms"])

class BroadcastRequest(BaseModel):
    title: str
    message: str

class DirectMessageRequest(BaseModel):
    tenant_id: str
    title: str
    message: str

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    target_tenant_id: Optional[str] = None
    target_tenant_name: Optional[str] = None
    created_at: str
    read_at: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/admin/comms/broadcast")
async def broadcast_to_all(
    req: BroadcastRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant))
    tenants = result.scalars().all()
    for t in tenants:
        db.add(Notification(
            id=uuid.uuid4(),
            type='broadcast',
            title=req.title,
            message=req.message,
            sender_id=current_user.id,
            target_tenant_id=t.id,
            created_at=datetime.utcnow()
        ))
    await db.commit()
    return {"status": "ok", "sent_to": len(tenants)}

@router.post("/admin/comms/direct")
async def direct_message(
    req: DirectMessageRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = uuid.UUID(req.tenant_id)
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    db.add(Notification(
        id=uuid.uuid4(),
        type='direct',
        title=req.title,
        message=req.message,
        sender_id=current_user.id,
        target_tenant_id=tenant_id,
        created_at=datetime.utcnow()
    ))
    await db.commit()
    return {"status": "ok", "target": tenant.name}

@router.get("/admin/comms/history")
async def comms_history(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).order_by(desc(Notification.created_at)).limit(50)
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    tenant_ids = {n.target_tenant_id for n in notifications if n.target_tenant_id}
    tenants = {}
    if tenant_ids:
        t_result = await db.execute(select(Tenant).where(Tenant.id.in_(tenant_ids)))
        for t in t_result.scalars().all():
            tenants[str(t.id)] = t.name

    return [
        NotificationResponse(
            id=str(n.id),
            type=n.type,
            title=n.title,
            message=n.message,
            target_tenant_id=str(n.target_tenant_id) if n.target_tenant_id else None,
            target_tenant_name=tenants.get(str(n.target_tenant_id)) if n.target_tenant_id else None,
            created_at=n.created_at.isoformat() if n.created_at else "",
            read_at=n.read_at.isoformat() if n.read_at else None
        )
        for n in notifications
    ]

# ── ISP-facing notification endpoints ─────────────────────────────────────

@router.get("/notifications")
async def get_my_notifications(
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).where(
        Notification.target_tenant_id == current_user.tenant_id
    ).order_by(desc(Notification.created_at)).limit(20)
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return [
        NotificationResponse(
            id=str(n.id),
            type=n.type,
            title=n.title,
            message=n.message,
            created_at=n.created_at.isoformat() if n.created_at else "",
            read_at=n.read_at.isoformat() if n.read_at else None
        )
        for n in notifications
    ]

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db)
):
    nid = uuid.UUID(notification_id)
    stmt = select(Notification).where(
        Notification.id == nid,
        Notification.target_tenant_id == current_user.tenant_id
    )
    result = await db.execute(stmt)
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}
