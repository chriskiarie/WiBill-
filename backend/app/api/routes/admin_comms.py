"""
Comms - platform admin can send broadcast/direct notifications to ISPs.
Also sends real emails via SMTP when SMTP is configured.
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
from app.services.email_service import send_email

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

    email_results = {"sent": 0, "failed": 0, "skipped": 0}

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

        # Send email to all ISP admins for this tenant
        admins_result = await db.execute(
            select(AdminUser).where(
                AdminUser.tenant_id == t.id,
                AdminUser.is_active == True
            )
        )
        admins = admins_result.scalars().all()
        for admin in admins:
            ok = await send_email(
                to_email=admin.email,
                subject=f"[HonestBill] {req.title}",
                html_body=f"<h2>{req.title}</h2><p>{req.message}</p><hr><p style='color:#888'>HonestBill Platform</p>",
                text_body=f"{req.title}\n\n{req.message}\n\n-- HonestBill Platform",
                db=db,
            )
            if ok:
                email_results["sent"] += 1
            else:
                email_results["failed"] += 1

    await db.commit()
    return {
        "status": "ok",
        "sent_to": len(tenants),
        "emails": email_results,
    }

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

    # Send email to all ISP admins for this tenant
    email_results = {"sent": 0, "failed": 0}
    admins_result = await db.execute(
        select(AdminUser).where(
            AdminUser.tenant_id == tenant_id,
            AdminUser.is_active == True
        )
    )
    admins = admins_result.scalars().all()
    for admin in admins:
        ok = await send_email(
            to_email=admin.email,
            subject=f"[HonestBill] {req.title}",
            html_body=f"<h2>{req.title}</h2><p>{req.message}</p><hr><p style='color:#888'>HonestBill Platform</p>",
            text_body=f"{req.title}\n\n{req.message}\n\n-- HonestBill Platform",
            db=db,
        )
        if ok:
            email_results["sent"] += 1
        else:
            email_results["failed"] += 1

    await db.commit()
    return {"status": "ok", "target": tenant.name, "emails": email_results}

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
    ).order_by(desc(Notification.created_at)).limit(50)
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    # Also include invoice notifications from invoices table
    from app.models.invoice import Invoice
    inv_stmt = select(Invoice).where(
        Invoice.tenant_id == current_user.tenant_id
    ).order_by(desc(Invoice.created_at)).limit(10)
    inv_result = await db.execute(inv_stmt)
    invoices = inv_result.scalars().all()

    combined = list(notifications)
    for inv in invoices:
        inv_status = inv.status.value if hasattr(inv.status, 'value') else inv.status
        if inv_status == 'paid':
            combined.append(type('obj', (object,), {
                'id': inv.id, 'type': 'payment_received', 'title': f"Payment Received — KSh {float(inv.amount_due):,.0f}",
                'message': f"Invoice {inv.invoice_number} paid on {inv.paid_date.strftime('%d %b %Y') if inv.paid_date else 'N/A'}.",
                'created_at': inv.paid_date or inv.created_at,
                'read_at': None,
            }))

    combined.sort(key=lambda n: n.created_at, reverse=True)

    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "created_at": n.created_at.isoformat() if hasattr(n.created_at, 'isoformat') else str(n.created_at),
            "read_at": n.read_at.isoformat() if hasattr(n.read_at, 'isoformat') and n.read_at else None,
        }
        for n in combined[:50]
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


@router.get("/notifications/unread-count")
async def unread_notification_count(
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return count of unread notifications for the ISP."""
    result = await db.execute(
        select(Notification).where(
            Notification.target_tenant_id == current_user.tenant_id,
            Notification.read_at.is_(None),
        )
    )
    notifications = result.scalars().all()
    return {"unread": len(notifications)}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for this ISP."""
    await db.execute(
        Notification.__table__.update().where(
            Notification.target_tenant_id == current_user.tenant_id,
            Notification.read_at.is_(None),
        ).values(read_at=datetime.utcnow())
    )
    await db.commit()
    return {"status": "ok", "message": "All notifications marked as read"}
