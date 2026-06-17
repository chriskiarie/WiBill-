import uuid, os, httpx, logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.notification import Notification
from app.api.routes.auth import require_isp_admin

logger = logging.getLogger(__name__)
router = APIRouter(tags=["payment-notifications"])


class PaymentNotificationInput(BaseModel):
    transaction_code: str
    amount_paid: float
    notes: str | None = None


@router.post("/payment-notifications")
async def submit_payment_notification(
    payload: PaymentNotificationInput,
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db),
):
    """ISP submits proof of payment after manual M-Pesa transfer."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="No tenant on this account")

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    tenant_name = tenant.name if tenant else 'Unknown'

    n = Notification(
        id=uuid.uuid4(),
        type="direct",
        title=f"Payment notification — {tenant_name}",
        message=f"Transaction code: {payload.transaction_code}\nAmount: KES {payload.amount_paid:,.2f}\nNotes: {payload.notes or '—'}",
        sender_id=current_user.id,
        target_tenant_id=current_user.tenant_id,
        created_at=datetime.utcnow(),
    )
    db.add(n)
    await db.commit()

    # Send email to platform admins
    try:
        resend_key = os.environ.get("RESEND_API_KEY", "")
        if resend_key and tenant:
            admin_result = await db.execute(
                select(AdminUser).where(AdminUser.role == "platform_admin")
            )
            admins = admin_result.scalars().all()
            if admins and tenant:
                async with httpx.AsyncClient() as client:
                    for admin in admins:
                        await client.post(
                            "https://api.resend.com/emails",
                            headers={
                                "Authorization": f"Bearer {resend_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "from": "XwB <notifications@resend.dev>",
                                "to": [admin.email],
                                "subject": f"Payment notification — {tenant.name}",
                                "html": f"""
                                    <div style="font-family:sans-serif;max-width:600px">
                                        <h2>Payment notification</h2>
                                        <p><strong>{tenant.name}</strong> has submitted a payment notification.</p>
                                        <table style="border-collapse:collapse;width:100%;margin:16px 0">
                                            <tr><td style="padding:8px;border:1px solid #ddd">Transaction code</td><td style="padding:8px;border:1px solid #ddd">{payload.transaction_code}</td></tr>
                                            <tr><td style="padding:8px;border:1px solid #ddd">Amount paid</td><td style="padding:8px;border:1px solid #ddd">KES {payload.amount_paid:,.2f}</td></tr>
                                            <tr><td style="padding:8px;border:1px solid #ddd">Notes</td><td style="padding:8px;border:1px solid #ddd">{payload.notes or '—'}</td></tr>
                                            <tr><td style="padding:8px;border:1px solid #ddd">ISP</td><td style="padding:8px;border:1px solid #ddd">{tenant.name}</td></tr>
                                        </table>
                                        <p style="color:#666;font-size:12px">View in Batcave to verify and update invoice status.</p>
                                    </div>
                                """,
                            },
                            timeout=10.0,
                        )
    except Exception as e:
        logger.warning(f"Failed to send payment notification email: {e}")

    return {"ok": True, "notification_id": str(n.id)}


@router.get("/payment-notifications")
async def list_payment_notifications(
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get payment notifications for this ISP."""
    from app.models.notification import Notification
    stmt = (
        select(Notification)
        .where(
            Notification.target_tenant_id == current_user.tenant_id,
            Notification.title.like("Payment notification%"),
        )
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    notes = result.scalars().all()
    return [
        {
            "id": str(n.id),
            "transaction_code": n.message.split("\n")[0].replace("Transaction code: ", "") if n.message else "",
            "amount_paid": float(n.message.split("\n")[1].replace("Amount: KES ", "").replace(",", "")) if n.message else 0,
            "status": "read" if n.read_at else "unread",
            "created_at": n.created_at.isoformat() if n.created_at else "",
        }
        for n in notes
    ]
