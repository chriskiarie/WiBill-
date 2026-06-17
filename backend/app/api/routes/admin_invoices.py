"""
Admin invoice tracking endpoints.
"""
from typing import Optional
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.api.routes.auth import get_current_user, require_platform_admin

router = APIRouter(tags=["admin-invoices"])


class InvoiceStatusResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_slug: str
    is_active: bool
    status: str
    invoice_status: str
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
            invoice_status=getattr(t, 'invoice_status', 'active') or 'active',
            monthly_fee_ksh=float(t.monthly_fee_ksh) if t.monthly_fee_ksh else None,
            next_invoice_date=t.next_invoice_date.isoformat() if t.next_invoice_date else None,
            last_paid_date=t.last_paid_date.isoformat() if t.last_paid_date else None,
            avg_days_punctual=float(t.avg_days_punctual) if t.avg_days_punctual else None,
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
    tid = uuid.UUID(tenant_id)
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    now = datetime.now(timezone.utc)
    if tenant.last_paid_date:
        days_diff = (now - tenant.last_paid_date).days
        old_avg = tenant.avg_days_punctual or 0
        tenant.avg_days_punctual = (old_avg + days_diff) / 2
    tenant.last_paid_date = now
    tenant.invoice_status = 'active'
    tenant.monthly_fee_ksh = body.monthly_fee_ksh
    await db.commit()
    return {"status": "ok", "message": f"{tenant.name} marked as paid"}


@router.patch("/admin/invoices/{tenant_id}/status")
async def update_invoice_status(
    tenant_id: str,
    body: dict,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(tenant_id)
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_status = body.get("invoice_status", "active")
    if new_status not in ("active", "overdue", "paused"):
        raise HTTPException(status_code=400, detail="Invalid status")

    tenant.invoice_status = new_status
    await db.commit()
    return {"status": "ok", "invoice_status": new_status}
