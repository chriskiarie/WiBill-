"""
backend/app/services/mpesa_service.py
Business logic for M-Pesa payments.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
import logging

from app.models.mpesa_config import MpesaConfig, MpesaConfigStatus
from app.models.mpesa_transaction import MpesaTransaction, MpesaTransactionStatus, MpesaTransactionType
from app.models.invoice import Invoice, InvoiceStatus
from app.models.session import Session
from app.services.daraja_service import initiate_stk_push, query_stk_status
from app.services.crypto_service import encrypt
from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIG MANAGEMENT
# ============================================================================

async def get_mpesa_config(tenant_id: UUID, db: AsyncSession) -> MpesaConfig | None:
    """Get active M-Pesa config for a tenant."""
    result = await db.execute(
        select(MpesaConfig).where(
            and_(
                MpesaConfig.tenant_id == tenant_id,
                MpesaConfig.is_active == True,
            )
        )
    )
    return result.scalar_one_or_none()


async def save_mpesa_config(
    tenant_id: UUID,
    consumer_key: str,
    consumer_secret: str,
    shortcode: str,
    passkey: str,
    account_reference: str,
    payout_phone: str,
    payout_account_name: str,
    db: AsyncSession,
) -> MpesaConfig:
    """Save or update M-Pesa config for a tenant. Encrypts credentials."""

    existing = await get_mpesa_config(tenant_id, db)

    if existing:
        existing.consumer_key_enc = encrypt(consumer_key)
        existing.consumer_secret_enc = encrypt(consumer_secret)
        existing.shortcode = shortcode
        existing.passkey_enc = encrypt(passkey)
        existing.account_reference = account_reference
        existing.payout_phone = payout_phone
        existing.payout_account_name = payout_account_name
        existing.status = "configured"
        existing.is_verified = False
        await db.commit()
        return existing

    config = MpesaConfig(
        id=uuid4(),
        tenant_id=tenant_id,
        consumer_key_enc=encrypt(consumer_key),
        consumer_secret_enc=encrypt(consumer_secret),
        shortcode=shortcode,
        passkey_enc=encrypt(passkey),
        account_reference=account_reference,
        payout_phone=payout_phone,
        payout_account_name=payout_account_name,
        status="configured",
        is_active=True,
        is_verified=False,
    )
    db.add(config)
    await db.commit()
    return config


# ============================================================================
# PAYMENT INITIATION
# ============================================================================

async def initiate_session_payment(
    tenant_id: UUID,
    session_id: UUID,
    phone_number: str,
    amount: Decimal,
    db: AsyncSession,
) -> MpesaTransaction:
    """Initiate STK push for a hotspot session payment."""

    config = await get_mpesa_config(tenant_id, db)
    if not config:
        raise Exception("M-Pesa not configured for this ISP")
    if not config.is_verified:
        raise Exception("M-Pesa config not verified yet")

    # Create pending transaction record
    txn = MpesaTransaction(
        id=uuid4(),
        tenant_id=tenant_id,
        mpesa_config_id=config.id,
        amount_ksh=amount,
        phone_number=phone_number,
        payment_type="session",
        reference_id=session_id,
        status="pending",
    )
    db.add(txn)
    await db.flush()

    try:
        result = await initiate_stk_push(
            consumer_key_enc=config.consumer_key_enc,
            consumer_secret_enc=config.consumer_secret_enc,
            shortcode=config.shortcode,
            passkey_enc=config.passkey_enc,
            phone_number=phone_number,
            amount=amount,
            account_reference=config.account_reference,
            description="WiFi Session",
            callback_url=settings.MPESA_CALLBACK_URL,
        )

        txn.merchant_request_id = result.get("MerchantRequestID")
        txn.checkout_request_id = result.get("CheckoutRequestID")
        txn.response_code = result.get("ResponseCode")
        txn.response_description = result.get("ResponseDescription")

        if result.get("ResponseCode") == "0":
            txn.status = "processing"
        else:
            txn.status = "failed"
            txn.error_reason = result.get("ResponseDescription")

    except Exception as e:
        txn.status = "failed"
        txn.error_reason = str(e)
        logger.error(f"STK push failed: {e}")

    await db.commit()
    return txn


async def initiate_invoice_payment(
    tenant_id: UUID,
    invoice_id: UUID,
    phone_number: str,
    db: AsyncSession,
) -> MpesaTransaction:
    """Initiate STK push for an invoice payment."""

    invoice_result = await db.execute(
        select(Invoice).where(
            and_(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id)
        )
    )
    invoice = invoice_result.scalar_one_or_none()
    if not invoice:
        raise Exception("Invoice not found")

    config = await get_mpesa_config(tenant_id, db)
    if not config:
        raise Exception("M-Pesa not configured for this ISP")

    txn = MpesaTransaction(
        id=uuid4(),
        tenant_id=tenant_id,
        mpesa_config_id=config.id,
        amount_ksh=invoice.amount_due,
        phone_number=phone_number,
        payment_type="invoice",
        reference_id=invoice_id,
        status="pending",
    )
    db.add(txn)
    await db.flush()

    try:
        result = await initiate_stk_push(
            consumer_key_enc=config.consumer_key_enc,
            consumer_secret_enc=config.consumer_secret_enc,
            shortcode=config.shortcode,
            passkey_enc=config.passkey_enc,
            phone_number=phone_number,
            amount=invoice.amount_due,
            account_reference=config.account_reference,
            description="Invoice Payment",
            callback_url=settings.MPESA_CALLBACK_URL,
        )

        txn.merchant_request_id = result.get("MerchantRequestID")
        txn.checkout_request_id = result.get("CheckoutRequestID")
        txn.response_code = result.get("ResponseCode")
        txn.response_description = result.get("ResponseDescription")
        txn.status = "processing" if result.get("ResponseCode") == "0" else "failed"

    except Exception as e:
        txn.status = "failed"
        txn.error_reason = str(e)

    await db.commit()
    return txn


# ============================================================================
# CALLBACK PROCESSING
# ============================================================================

async def process_callback(callback_body: dict, db: AsyncSession) -> bool:
    """
    Process Daraja STK callback.
    Called by POST /api/mpesa/callback.
    """
    try:
        stk = callback_body["Body"]["stkCallback"]
        checkout_request_id = stk["CheckoutRequestID"]
        result_code = str(stk["ResultCode"])
        result_desc = stk.get("ResultDesc", "")

        result = await db.execute(
            select(MpesaTransaction).where(
                MpesaTransaction.checkout_request_id == checkout_request_id
            )
        )
        txn = result.scalar_one_or_none()

        if not txn:
            logger.warning(f"No transaction found for CheckoutRequestID: {checkout_request_id}")
            return False

        if txn.is_processed:
            logger.info(f"Transaction {txn.id} already processed, skipping")
            return True

        txn.result_code = result_code
        txn.result_description = result_desc
        txn.completed_at = datetime.utcnow()
        txn.is_processed = True

        if result_code == "0":
            # SUCCESS
            metadata = stk.get("CallbackMetadata", {}).get("Item", [])
            meta = {item["Name"]: item.get("Value") for item in metadata}

            txn.mpesa_receipt_number = meta.get("MpesaReceiptNumber")
            txn.transaction_date = _parse_mpesa_date(meta.get("TransactionDate"))
            txn.balance_ksh = meta.get("Balance")
            txn.status = "success"

            # Post-payment actions
            if txn.payment_type == "invoice":
                await _handle_invoice_paid(txn, db)
            elif txn.payment_type == "session":
                await _handle_session_paid(txn, db)

        else:
            txn.status = "failed"
            txn.error_reason = result_desc
            # Update session status for failed session payments
            if txn.payment_type == "session":
                await _handle_session_failed(txn, db)

        await db.commit()
        logger.info(f"Callback processed: {checkout_request_id} --- {txn.status}")
        return True

    except Exception as e:
        logger.error(f"Callback processing error: {e}")
        await db.rollback()
        return False


async def _handle_invoice_paid(txn: MpesaTransaction, db: AsyncSession):
    """Mark invoice as paid after successful M-Pesa payment."""
    from app.services.invoice_service import process_invoice_payment
    await process_invoice_payment(
        invoice_id=txn.reference_id,
        mpesa_receipt=txn.mpesa_receipt_number,
        payment_method="mpesa",
        db=db,
    )


async def _handle_session_paid(txn: MpesaTransaction, db: AsyncSession):
    """Activate session after successful payment."""
    result = await db.execute(select(Session).where(Session.id == txn.reference_id))
    session = result.scalar_one_or_none()
    if session:
        session.status = "active"
        session.payment_confirmed = True
        logger.info(f"Session {session.id} activated after payment")


async def _handle_session_failed(txn: MpesaTransaction, db: AsyncSession):
    """Mark session as failed after failed payment."""
    result = await db.execute(select(Session).where(Session.id == txn.reference_id))
    session = result.scalar_one_or_none()
    if session:
        session.status = "failed"
        logger.info(f"Session {session.id} marked as failed after payment error: {txn.error_reason}")


def _parse_mpesa_date(date_int) -> datetime | None:
    """Parse M-Pesa date format: 20260528223000"""
    if not date_int:
        return None
    try:
        return datetime.strptime(str(date_int), "%Y%m%d%H%M%S")
    except Exception:
        return None


# ============================================================================
# STATUS POLLING
# ============================================================================

async def get_transaction_status(checkout_request_id: str, db: AsyncSession) -> dict:
    """
    Get current status of a transaction.
    Frontend polls this every 2 seconds.
    """
    result = await db.execute(
        select(MpesaTransaction).where(
            MpesaTransaction.checkout_request_id == checkout_request_id
        )
    )
    txn = result.scalar_one_or_none()

    if not txn:
        return {"status": "not_found", "error": "Transaction not found"}

    # If still processing, query Daraja directly for latest status
    if txn.status == "processing" and not txn.is_processed:
        config = await get_mpesa_config(txn.tenant_id, db)
        if config:
            try:
                daraja_result = await query_stk_status(
                    consumer_key_enc=config.consumer_key_enc,
                    consumer_secret_enc=config.consumer_secret_enc,
                    shortcode=config.shortcode,
                    passkey_enc=config.passkey_enc,
                    checkout_request_id=checkout_request_id,
                )
                # Daraja result code 0 = success (but we wait for callback to confirm)
                logger.info(f"Daraja query result: {daraja_result}")
            except Exception as e:
                logger.warning(f"Daraja status query failed: {e}")

    return {
        "status": txn.status,
        "checkout_request_id": checkout_request_id,
        "amount_ksh": float(txn.amount_ksh),
        "phone_number": txn.phone_number,
        "mpesa_receipt": txn.mpesa_receipt_number,
        "completed_at": txn.completed_at.isoformat() if txn.completed_at else None,
        "error_reason": txn.error_reason,
    }