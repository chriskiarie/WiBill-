"""
Admin invoice tracking endpoints.
"""
from typing import Optional
import uuid

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
            invoice_status=getattr(t, 'invoice_status', 'active') or 'active',
            monthly_fee_ksh=float(t.monthly_fee_ksh) if getattr(t, 'monthly_fee_ksh', None) else None,
            next_invoice_date=t.next_invoice_date.isoformat() if getattr(t, 'next_invoice_date', None) else None,
            last_paid_date=t.last_paid_date.isoformat() if getattr(t, 'last_paid_date', None) else None,
            avg_days_punctual=float(t.avg_days_punctual) if getattr(t, 'avg_days_punctual', None) else None,
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
    return {"ok": False, "message": "Database migration required. Run: alembic upgrade d4e5f6a7b8c9"}


@router.patch("/admin/invoices/{tenant_id}/status")
async def update_invoice_status(
    tenant_id: str,
    body: dict,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    return {"ok": False, "message": "Database migration required. Run: alembic upgrade d4e5f6a7b8c9"}
