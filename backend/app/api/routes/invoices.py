"""
backend/app/api/routes/invoices.py
Invoice management endpoints
FIX: Use string literals for all enum comparisons (asyncpg native enum casing issue)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, text
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.tenant import Tenant
from app.models.invoice_transaction import InvoiceTransaction
from app.services.invoice_service import (
    create_monthly_invoice,
    process_invoice_payment,
    get_invoice_pdf,
)
from app.api.routes.auth import get_current_user

router = APIRouter(tags=["invoices"])


# ============================================================================
# HELPERS
# ============================================================================

def _attr(user, key):
    """Read from ORM model or dict safely."""
    if isinstance(user, dict):
        return user.get(key)
    return getattr(user, key, None)


def _require_admin(user):
    role = _attr(user, "role")
    if role not in ("platform_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


# ============================================================================
# ISP ENDPOINTS  (literal routes BEFORE /{invoice_id})
# ============================================================================

@router.get("/invoices/current-status")
async def get_current_status(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current month invoice status for ISP."""
    tenant_id_raw = _attr(current_user, "tenant_id")
    try:
        tenant_id = UUID(str(tenant_id_raw))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="No tenant_id on this account")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    today = datetime.utcnow()
    result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.month == today.month,
                Invoice.year == today.year,
            )
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        return {
            "status": "none",
            "invoice_id": None,
            "amount_due": 0,
            "due_date": None,
            "days_left": None,
            "is_locked": tenant.is_locked,
            "locked_reason": tenant.locked_reason,
        }

    days_left = (invoice.due_date - datetime.utcnow()).days if invoice.due_date else None
    return {
        "status": invoice.status.value if hasattr(invoice.status, "value") else invoice.status,
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "amount_due": float(invoice.amount_due),
        "due_date": invoice.due_date.isoformat(),
        "days_left": days_left,
        "days_overdue": max(0, -days_left) if days_left is not None else 0,
        "is_locked": tenant.is_locked,
        "locked_reason": tenant.locked_reason,
        "paid_date": invoice.paid_date.isoformat() if invoice.paid_date else None,
    }


@router.get("/invoices")
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List invoices for current ISP."""
    tenant_id_raw = _attr(current_user, "tenant_id")
    try:
        tenant_id = UUID(str(tenant_id_raw))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="No tenant_id on this account")

    query = select(Invoice).where(Invoice.tenant_id == tenant_id)
    if status:
        query = query.where(Invoice.status == status)
    query = query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit)

    result = await db.execute(query)
    invoices = result.scalars().all()

    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "month": inv.month,
            "year": inv.year,
            "amount_due": float(inv.amount_due),
            "gross_revenue": float(inv.gross_revenue),
            "platform_fee": float(inv.platform_fee),
            "isp_earnings": float(inv.isp_earnings),
            "issued_date": inv.issued_date.isoformat(),
            "due_date": inv.due_date.isoformat(),
            "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
            "status": inv.status.value if hasattr(inv.status, "value") else inv.status,
            "payment_method": inv.payment_method,
        }
        for inv in invoices
    ]


# ============================================================================
# ADMIN ENDPOINTS  (all /admin/* before /{invoice_id})
# ============================================================================

@router.get("/invoices/admin/all")
async def admin_list_all_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ADMIN: List all invoices from all ISPs."""
    _require_admin(current_user)

    result = await db.execute(
        select(Invoice).order_by(desc(Invoice.created_at)).offset(skip).limit(limit)
    )
    invoices = result.scalars().all()

    return [
        {
            "id": str(inv.id),
            "tenant_id": str(inv.tenant_id),
            "invoice_number": inv.invoice_number,
            "amount_due": float(inv.amount_due),
            "status": inv.status.value if hasattr(inv.status, "value") else inv.status,
            "due_date": inv.due_date.isoformat(),
            "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
        }
        for inv in invoices
    ]


@router.get("/invoices/admin/overdue")
async def admin_get_overdue_invoices(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ADMIN: Get all overdue invoices."""
    _require_admin(current_user)

    # FIX: use raw string "overdue" - bypasses asyncpg native enum name/value mismatch
    result = await db.execute(
        select(Invoice).where(Invoice.status == "overdue")
    )
    invoices = result.scalars().all()

    return [
        {
            "id": str(inv.id),
            "tenant_id": str(inv.tenant_id),
            "invoice_number": inv.invoice_number,
            "amount_due": float(inv.amount_due),
            "due_date": inv.due_date.isoformat(),
            "days_overdue": (datetime.utcnow() - inv.due_date).days,
        }
        for inv in invoices
    ]


@router.get("/invoices/admin/billing-report")
async def admin_billing_report(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ADMIN: Get billing metrics."""
    _require_admin(current_user)

    result = await db.execute(select(Invoice))
    all_invoices = result.scalars().all()

    def status_val(inv):
        return inv.status.value if hasattr(inv.status, "value") else inv.status

    total           = len(all_invoices)
    total_revenue   = sum(float(inv.gross_revenue) for inv in all_invoices)
    total_fees      = sum(float(inv.platform_fee)  for inv in all_invoices)
    total_paid      = sum(float(inv.amount_due)    for inv in all_invoices if status_val(inv) == "paid")
    overdue_count   = sum(1 for inv in all_invoices if status_val(inv) == "overdue")
    paid_count      = sum(1 for inv in all_invoices if status_val(inv) == "paid")

    return {
        "total_invoices":         total,
        "total_gross_revenue":    total_revenue,
        "total_platform_fees":    total_fees,
        "total_paid":             total_paid,
        "paid_invoices_count":    paid_count,
        "overdue_invoices_count": overdue_count,
        "collection_rate":        (paid_count / total * 100) if total else 0,
    }


@router.post("/invoices/admin/test-create-invoice")
async def test_create_invoice(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """TEST: Manually trigger invoice creation."""
    _require_admin(current_user)

    try:
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one()
        today  = datetime.utcnow()
        invoice = await create_monthly_invoice(tenant.id, today.month, today.year, db)
        return {
            "success":        True,
            "invoice_id":     str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "amount_due":     float(invoice.amount_due),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/admin/test-check-overdue")
async def test_check_overdue(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """TEST: Manually trigger overdue check."""
    _require_admin(current_user)

    try:
        from app.services.invoice_service import check_overdue_invoices
        result = await check_overdue_invoices(db)
        return {
            "success":             True,
            "invoices_checked":    result.get("checked", 0),
            "accounts_locked":     result.get("locked", 0),
            "sessions_terminated": result.get("terminated_sessions", 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PARAMETRIC ISP ENDPOINTS  (MUST stay after all literal routes)
# ============================================================================

@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single invoice with transaction details."""
    tenant_id_raw = _attr(current_user, "tenant_id")
    try:
        inv_id    = UUID(invoice_id)
        tenant_id = UUID(str(tenant_id_raw))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await db.execute(
        select(Invoice).where(and_(Invoice.id == inv_id, Invoice.tenant_id == tenant_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    tx_result = await db.execute(
        select(InvoiceTransaction).where(InvoiceTransaction.invoice_id == inv_id)
    )
    transactions = tx_result.scalars().all()

    return {
        "id":             str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "month":          invoice.month,
        "year":           invoice.year,
        "amount_due":     float(invoice.amount_due),
        "gross_revenue":  float(invoice.gross_revenue),
        "platform_fee":   float(invoice.platform_fee),
        "isp_earnings":   float(invoice.isp_earnings),
        "issued_date":    invoice.issued_date.isoformat(),
        "due_date":       invoice.due_date.isoformat(),
        "paid_date":      invoice.paid_date.isoformat() if invoice.paid_date else None,
        "status":         invoice.status.value if hasattr(invoice.status, "value") else invoice.status,
        "payment_method": invoice.payment_method,
        "transactions": [
            {
                "id":             str(tx.id),
                "transaction_id": str(tx.transaction_id),
                "amount_ksh":     float(tx.amount_ksh),
            }
            for tx in transactions
        ],
    }


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download invoice PDF (stub)."""
    tenant_id_raw = _attr(current_user, "tenant_id")
    try:
        inv_id    = UUID(invoice_id)
        tenant_id = UUID(str(tenant_id_raw))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await db.execute(
        select(Invoice).where(and_(Invoice.id == inv_id, Invoice.tenant_id == tenant_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    await get_invoice_pdf(invoice, db)
    return {"success": True, "message": "PDF stub - implement with reportlab in Phase 4C"}


@router.post("/invoices/{invoice_id}/pay")
async def mark_invoice_paid(
    invoice_id: str,
    payload: dict,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark invoice as paid."""
    tenant_id_raw = _attr(current_user, "tenant_id")
    try:
        inv_id    = UUID(invoice_id)
        tenant_id = UUID(str(tenant_id_raw))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    mpesa_receipt  = payload.get("mpesa_receipt")
    payment_method = payload.get("payment_method", "mpesa")

    if not mpesa_receipt:
        raise HTTPException(status_code=400, detail="M-Pesa receipt required")

    result = await db.execute(
        select(Invoice).where(and_(Invoice.id == inv_id, Invoice.tenant_id == tenant_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    updated = await process_invoice_payment(inv_id, mpesa_receipt, payment_method, db)
    return {
        "success":   True,
        "status":    updated.status.value if hasattr(updated.status, "value") else updated.status,
        "paid_date": updated.paid_date.isoformat() if updated.paid_date else None,
    }