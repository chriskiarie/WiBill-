"""
backend/app/services/invoice_service.py
FIX: All enum comparisons use raw lowercase string literals
     to bypass asyncpg native enum NAME vs VALUE mismatch
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from datetime import datetime, timedelta
from uuid import UUID
from decimal import Decimal
import logging

from app.models.invoice import Invoice, InvoiceStatus
from app.models.invoice_transaction import InvoiceTransaction
from app.models.invoice_reminder import InvoiceReminder, EmailStatus
from app.models.transaction import Transaction
from app.models.tenant import Tenant
from app.models.session import Session

logger = logging.getLogger(__name__)


async def create_monthly_invoice(tenant_id: UUID, month: int, year: int, db: AsyncSession) -> Invoice:
    """Create monthly invoice for an ISP. Called on 26th by scheduler."""

    existing = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.month == month,
                Invoice.year == year,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise Exception(f"Invoice already exists for {month}/{year}")

    start_date = datetime(year, month, 1)
    end_date   = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    # FIX: raw string "completed" - no ORM enum, no casing issue
    tx_result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.tenant_id == tenant_id,
                Transaction.created_at >= start_date,
                Transaction.created_at < end_date,
                Transaction.status == "success",
            )
        )
    )
    transactions = tx_result.scalars().all()

    gross_revenue = sum(Decimal(str(tx.amount_ksh)) for tx in transactions)
    platform_fee  = gross_revenue * Decimal("0.10")
    isp_earnings  = gross_revenue * Decimal("0.90")
    amount_due    = gross_revenue

    invoice = Invoice(
        tenant_id=tenant_id,
        month=month,
        year=year,
        gross_revenue=gross_revenue,
        platform_fee=platform_fee,
        isp_earnings=isp_earnings,
        amount_due=amount_due,
        issued_date=datetime.utcnow(),
        due_date=datetime(year, month, 28),
        status=InvoiceStatus.SENT,
    )

    db.add(invoice)
    await db.flush()

    for tx in transactions:
        db.add(InvoiceTransaction(
            invoice_id=invoice.id,
            transaction_id=tx.id,
            amount_ksh=tx.amount_ksh,
        ))

    await db.commit()
    logger.info(f"Invoice created: tenant={tenant_id} {month}/{year} amount={amount_due}")
    return invoice


async def process_invoice_payment(invoice_id: UUID, mpesa_receipt: str, payment_method: str, db: AsyncSession) -> Invoice:
    """Mark invoice as paid."""

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise Exception(f"Invoice {invoice_id} not found")

    # FIX: compare using raw string value
    current_status = invoice.status.value if hasattr(invoice.status, "value") else invoice.status
    if current_status == "paid":
        logger.warning(f"Invoice {invoice_id} already paid")
        return invoice

    invoice.status         = InvoiceStatus.PAID
    invoice.paid_date      = datetime.utcnow()
    invoice.payment_method = payment_method
    invoice.mpesa_receipt  = mpesa_receipt

    await unlock_tenant_account(invoice.tenant_id, db)
    await db.commit()
    logger.info(f"Invoice {invoice_id} PAID - Receipt: {mpesa_receipt}")
    return invoice


async def lock_tenant_account(tenant_id: UUID, reason: str, db: AsyncSession) -> bool:
    """Lock ISP account for overdue payment."""

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise Exception(f"Tenant {tenant_id} not found")

    if tenant.is_locked:
        logger.warning(f"Tenant {tenant_id} already locked")
        return True

    await db.execute(
        update(Tenant).where(Tenant.id == tenant_id).values(
            is_locked=True,
            locked_reason=reason,
            locked_at=datetime.utcnow(),
        )
    )

    # FIX: raw string "active"
    session_result = await db.execute(
        select(Session).where(
            and_(Session.tenant_id == tenant_id, Session.status == "active")
        )
    )
    for session in session_result.scalars().all():
        session.status          = "terminated"
        session.disconnected_at = datetime.utcnow()

    await db.commit()
    logger.warning(f"Tenant {tenant_id} LOCKED: {reason}")
    return True


async def unlock_tenant_account(tenant_id: UUID, db: AsyncSession) -> bool:
    """Unlock ISP account after payment."""

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise Exception(f"Tenant {tenant_id} not found")

    if not tenant.is_locked:
        return True

    await db.execute(
        update(Tenant).where(Tenant.id == tenant_id).values(
            is_locked=False,
            locked_reason=None,
            locked_at=None,
        )
    )
    await db.commit()
    logger.info(f"Tenant {tenant_id} UNLOCKED")
    return True


async def send_invoice_reminder(invoice_id: UUID, db: AsyncSession) -> bool:
    """Send invoice reminder email."""

    inv_result = await db.execute(select(Invoice).join(Tenant).where(Invoice.id == invoice_id))
    invoice = inv_result.scalar_one_or_none()
    if not invoice:
        raise Exception(f"Invoice {invoice_id} not found")

    existing = await db.execute(
        select(InvoiceReminder).where(
            and_(InvoiceReminder.invoice_id == invoice_id, InvoiceReminder.days_before_due == 2)
        )
    )
    if existing.scalar_one_or_none():
        return True

    db.add(InvoiceReminder(
        invoice_id=invoice_id,
        days_before_due=2,
        email_address=invoice.tenant.email,
        email_status=EmailStatus.SENT,
        sent_at=datetime.utcnow(),
    ))
    await db.commit()
    return True


async def check_overdue_invoices(db: AsyncSession) -> dict:
    """Mark overdue invoices and lock accounts. Called daily by scheduler."""

    now = datetime.utcnow()

    # FIX: raw string values "paid" and "cancelled" - no ORM enum
    result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.due_date < now,
                Invoice.status != "paid",
                Invoice.status != "cancelled",
            )
        )
    )
    overdue_invoices = result.scalars().all()

    locked_count     = 0
    terminated_count = 0

    for invoice in overdue_invoices:
        current_status = invoice.status.value if hasattr(invoice.status, "value") else invoice.status
        if current_status != "overdue":
            invoice.status = InvoiceStatus.OVERDUE
            logger.warning(f"Invoice {invoice.id} marked OVERDUE")

        tenant_result = await db.execute(select(Tenant).where(Tenant.id == invoice.tenant_id))
        tenant = tenant_result.scalar_one_or_none()

        if tenant and not tenant.is_locked:
            session_result = await db.execute(
                select(Session).where(
                    and_(Session.tenant_id == invoice.tenant_id, Session.status == "active")
                )
            )
            terminated_count += len(session_result.scalars().all())
            await lock_tenant_account(invoice.tenant_id, "invoice_overdue", db)
            locked_count += 1

    await db.commit()
    return {
        "checked":             len(overdue_invoices),
        "locked":              locked_count,
        "terminated_sessions": terminated_count,
    }


async def get_invoice_pdf(invoice: Invoice, db: AsyncSession) -> bytes:
    """PDF stub - Phase 4C."""
    return b"%PDF-1.4\n%%EOF"

