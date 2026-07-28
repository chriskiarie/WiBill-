"""
Admin invoice tracking endpoints.
"""
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.invoice import Invoice, InvoiceStatus
from app.models.notification import Notification
from app.api.routes.auth import get_current_user, require_platform_admin
from app.services.email_service import send_email

router = APIRouter(tags=["admin-invoices"])


class InvoiceStatusResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_slug: str
    is_active: bool
    status: str
    invoice_status: str = "active"
    monthly_fee_ksh: Optional[float] = None
    next_invoice_date: Optional[str] = None
    last_paid_date: Optional[str] = None
    avg_days_punctual: Optional[float] = None


@router.get("/admin/invoices")
async def list_invoices(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).order_by(Tenant.name))
    tenants = result.scalars().all()
    return [
        InvoiceStatusResponse(
            tenant_id=str(t.id),
            tenant_name=t.name,
            tenant_slug=t.slug,
            is_active=t.is_active,
            status=t.status,
            invoice_status=t.invoice_status or "active",
            monthly_fee_ksh=float(t.monthly_fee_ksh) if t.monthly_fee_ksh is not None else None,
            next_invoice_date=t.next_invoice_date.isoformat() if t.next_invoice_date else None,
            last_paid_date=t.last_paid_date.isoformat() if t.last_paid_date else None,
            avg_days_punctual=float(t.avg_days_punctual) if t.avg_days_punctual is not None else None,
        )
        for t in tenants
    ]


class MarkPaidRequest(BaseModel):
    monthly_fee_ksh: float = 0


@router.patch("/admin/invoices/{tenant_id}/mark-paid")
async def mark_invoice_paid(
    tenant_id: str,
    body: MarkPaidRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == uuid.UUID(tenant_id)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    now = datetime.now(timezone.utc)

    # Calculate punctuality delta from last payment
    if tenant.last_paid_date:
        delta_days = (now - tenant.last_paid_date).days
        current_avg = tenant.avg_days_punctual or 0.0
        tenant.avg_days_punctual = round((current_avg + delta_days) / 2, 1)

    tenant.invoice_status = "active"
    tenant.is_active = True
    tenant.is_locked = False
    tenant.last_paid_date = now
    tenant.next_invoice_date = None
    if body.monthly_fee_ksh:
        tenant.monthly_fee_ksh = body.monthly_fee_ksh

    # Also update the Invoice record if one exists for this month
    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == tenant.id,
            Invoice.month == now.month,
            Invoice.year == now.year,
        )
    )
    invoice = inv_result.scalar_one_or_none()
    if invoice:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_date = now

    await db.commit()
    return {"ok": True, "invoice_status": "active"}


@router.patch("/admin/invoices/{tenant_id}/status")
async def update_invoice_status(
    tenant_id: str,
    body: dict,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == uuid.UUID(tenant_id)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_status = body.get("invoice_status", "active")
    valid = {"active", "pending", "overdue", "paused", "trial"}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(valid))}")

    tenant.invoice_status = new_status
    if new_status == "active" and not tenant.last_paid_date:
        tenant.last_paid_date = datetime.now(timezone.utc)

    # Also update the Invoice record if one exists for this month
    now = datetime.now(timezone.utc)
    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == tenant.id,
            Invoice.month == now.month,
            Invoice.year == now.year,
        )
    )
    invoice = inv_result.scalar_one_or_none()
    if invoice:
        status_map = {"active": "paid", "pending": "due", "overdue": "overdue", "paused": "due"}
        inv_status = status_map.get(new_status)
        if inv_status:
            invoice.status = inv_status

    await db.commit()
    return {"ok": True, "invoice_status": new_status}


class CreateInvoiceRequest(BaseModel):
    tenant_id: str
    monthly_fee_ksh: float = 0
    due_days: int = 30


@router.post("/admin/invoices/create")
async def create_invoice(
    body: CreateInvoiceRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or renew an invoice for an ISP. Also creates an Invoice record for the ISP dashboard."""
    result = await db.execute(select(Tenant).where(Tenant.id == uuid.UUID(body.tenant_id)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    now = datetime.now(timezone.utc)
    due = now + timedelta(days=body.due_days)

    # Check for existing invoice this month to prevent duplicates
    existing = await db.execute(
        select(Invoice).where(
            Invoice.tenant_id == tenant.id,
            Invoice.month == now.month,
            Invoice.year == now.year,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invoice already exists for this month")

    # Update tenant billing fields
    tenant.monthly_fee_ksh = body.monthly_fee_ksh
    tenant.next_invoice_date = due
    tenant.invoice_status = "pending"

    # Create an Invoice record so ISP dashboard sees it
    invoice = Invoice(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        month=now.month,
        year=now.year,
        gross_revenue=0,
        platform_fee=0,
        isp_earnings=0,
        amount_due=body.monthly_fee_ksh,
        issued_date=now,
        due_date=due,
        status=InvoiceStatus.DUE,
    )
    db.add(invoice)

    # Create notification for ISP
    db.add(Notification(
        id=uuid.uuid4(),
        type='invoice_due',
        title=f"Invoice Due — KSh {body.monthly_fee_ksh:,.0f}",
        message=f"Monthly invoice for {tenant.name} is due on {due.strftime('%d %b %Y')}. Amount: KSh {body.monthly_fee_ksh:,.0f}.",
        sender_id=current_user.id,
        target_tenant_id=tenant.id,
        created_at=datetime.utcnow(),
    ))

    await db.commit()
    return {
        "ok": True,
        "tenant_id": body.tenant_id,
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "monthly_fee_ksh": body.monthly_fee_ksh,
        "next_invoice_date": due.isoformat(),
        "invoice_status": "pending",
    }


class SendReminderResponse(BaseModel):
    sent: int
    failed: int
    details: list[dict]


@router.post("/admin/invoices/send-reminders")
async def send_invoice_reminders(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send email reminders to ISPs with pending or overdue invoices."""
    result = await db.execute(
        select(Tenant).where(
            Tenant.invoice_status.in_(["pending", "overdue", "paused"])
        )
    )
    tenants = result.scalars().all()

    sent = 0
    failed = 0
    details = []

    for t in tenants:
        admins_result = await db.execute(
            select(AdminUser).where(
                AdminUser.tenant_id == t.id,
                AdminUser.is_active == True,
            )
        )
        admins = admins_result.scalars().all()
        for admin in admins:
            status_label = t.invoice_status.upper()
            fee = t.monthly_fee_ksh or 0
            ok = await send_email(
                to_email=admin.email,
                subject=f"[HonestBill] Invoice {status_label} — {t.name}",
                html_body=(
                    f"<h2>Invoice {status_label}</h2>"
                    f"<p><strong>ISP:</strong> {t.name}</p>"
                    f"<p><strong>Amount:</strong> KSh {fee:,.2f}</p>"
                    f"<p><strong>Status:</strong> {status_label}</p>"
                    f"<hr><p style='color:#888'>HonestBill Platform</p>"
                ),
                text_body=f"Invoice {status_label}\n\nISP: {t.name}\nAmount: KSh {fee:,.2f}\nStatus: {status_label}\n\n-- HonestBill Platform",
                db=db,
            )
            if ok:
                sent += 1
            else:
                failed += 1
            details.append({"email": admin.email, "tenant": t.name, "ok": ok})

    return SendReminderResponse(sent=sent, failed=failed, details=details)


class SendInvoiceEmailRequest(BaseModel):
    tenant_id: str


@router.post("/admin/invoices/send")
async def send_invoice_email(
    body: SendInvoiceEmailRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send invoice email to a specific ISP."""
    result = await db.execute(select(Tenant).where(Tenant.id == uuid.UUID(body.tenant_id)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    admins_result = await db.execute(
        select(AdminUser).where(
            AdminUser.tenant_id == tenant.id,
            AdminUser.is_active == True,
        )
    )
    admins = admins_result.scalars().all()
    if not admins:
        raise HTTPException(status_code=400, detail="No active admin users for this ISP")

    sent = 0
    failed = 0
    for admin in admins:
        ok = await send_email(
            to_email=admin.email,
            subject=f"[HonestBill] Invoice — {tenant.name}",
            html_body=(
                f"<h2>Invoice for {tenant.name}</h2>"
                f"<p><strong>Amount:</strong> KSh {tenant.monthly_fee_ksh or 0:,.2f}</p>"
                f"<p><strong>Status:</strong> {tenant.invoice_status.upper()}</p>"
                f"<hr><p style='color:#888'>HonestBill Platform</p>"
            ),
            text_body=f"Invoice for {tenant.name}\n\nAmount: KSh {tenant.monthly_fee_ksh or 0:,.2f}\nStatus: {tenant.invoice_status.upper()}\n\n-- HonestBill Platform",
            db=db,
        )
        if ok:
            sent += 1
        else:
            failed += 1

    return {"ok": True, "target": tenant.name, "sent": sent, "failed": failed}
