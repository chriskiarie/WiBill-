"""
backend/app/api/routes/mpesa.py
M-Pesa payment endpoints -- Phase 4C
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel
import logging
import uuid

from app.core.config import settings
from app.core.database import get_db
from app.models.mpesa_config import MpesaConfig
from app.services.mpesa_service import (
    save_mpesa_config,
    get_mpesa_config,
    initiate_session_payment,
    initiate_invoice_payment,
    process_callback,
    get_transaction_status,
)
from app.services.daraja_service import get_access_token
from app.services.crypto_service import decrypt, encrypt
from app.api.routes.auth import get_current_user, require_isp_admin

router = APIRouter(tags=["mpesa"])
logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMAS
# ============================================================================

class MpesaConfigInput(BaseModel):
    consumer_key: str
    consumer_secret: str
    shortcode: str
    passkey: str
    account_reference: str
    payout_phone: str
    payout_account_name: str


class SessionPaymentInput(BaseModel):
    session_id: str
    phone_number: str
    amount_ksh: float


class InvoicePaymentInput(BaseModel):
    invoice_id: str
    phone_number: str

class PlatformInvoicePaymentInput(BaseModel):
    phone_number: str
    amount_ksh: float


# ============================================================================
# CONFIG ENDPOINTS (ISP Admin)
# ============================================================================

@router.post("/mpesa/config")
async def configure_mpesa(
    payload: MpesaConfigInput,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save M-Pesa configuration for the ISP."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    config = await save_mpesa_config(
        tenant_id=tenant_id,
        consumer_key=payload.consumer_key,
        consumer_secret=payload.consumer_secret,
        shortcode=payload.shortcode,
        passkey=payload.passkey,
        account_reference=payload.account_reference,
        payout_phone=payload.payout_phone,
        payout_account_name=payload.payout_account_name,
        db=db,
    )

    return {
        "success": True,
        "config_id": str(config.id),
        "status": config.status,
        "message": "M-Pesa configured. Run a test to verify.",
    }


@router.get("/mpesa/config")
async def get_config(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current M-Pesa config (safe -- no secrets returned)."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    config = await get_mpesa_config(tenant_id, db)
    if not config:
        return {"configured": False}

    return {
        "configured": True,
        "shortcode": config.shortcode,
        "account_reference": config.account_reference,
        "payout_phone": config.payout_phone,
        "payout_account_name": config.payout_account_name,
        "is_verified": config.is_verified,
        "status": config.status,
        "last_test_status": config.last_test_status,
        "last_test_at": config.last_test_at.isoformat() if config.last_test_at else None,
    }


@router.post("/mpesa/config/test")
async def test_mpesa_config(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test M-Pesa credentials by getting an access token."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    config = await get_mpesa_config(tenant_id, db)
    if not config:
        raise HTTPException(status_code=404, detail="M-Pesa not configured")

    try:
        consumer_key = decrypt(config.consumer_key_enc)
        consumer_secret = decrypt(config.consumer_secret_enc)
        token = await get_access_token(consumer_key, consumer_secret)

        config.is_verified = True
        config.status = "verified"
        config.last_test_status = "OK - Token obtained successfully"
        config.last_test_at = __import__("datetime").datetime.utcnow()
        await db.commit()

        return {
            "success": True,
            "message": "M-Pesa credentials verified successfully",
            "token_preview": token[:20] + "...",
        }
    except Exception as e:
        config.last_test_status = f"FAILED: {str(e)}"
        config.last_test_at = __import__("datetime").datetime.utcnow()
        await db.commit()
        raise HTTPException(status_code=400, detail=f"M-Pesa verification failed: {str(e)}")


# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

@router.post("/mpesa/pay/session")
async def pay_for_session(
    payload: SessionPaymentInput,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate STK push for a session payment."""
    tenant_id = UUID(str(getattr(current_user, "tenant_id")))

    try:
        txn = await initiate_session_payment(
            tenant_id=tenant_id,
            session_id=UUID(payload.session_id),
            phone_number=payload.phone_number,
            amount=Decimal(str(payload.amount_ksh)),
            db=db,
        )
        return {
            "success": txn.status == "processing",
            "checkout_request_id": txn.checkout_request_id,
            "status": txn.status,
            "message": "Check your phone for M-Pesa prompt" if txn.status == "processing" else txn.error_reason,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mpesa/pay/invoice")
async def pay_invoice(
    payload: InvoicePaymentInput,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate STK push for an invoice payment."""
    tenant_id = UUID(str(getattr(current_user, "tenant_id")))

    try:
        txn = await initiate_invoice_payment(
            tenant_id=tenant_id,
            invoice_id=UUID(payload.invoice_id),
            phone_number=payload.phone_number,
            db=db,
        )
        return {
            "success": txn.status == "processing",
            "checkout_request_id": txn.checkout_request_id,
            "status": txn.status,
            "message": "Check your phone for M-Pesa prompt" if txn.status == "processing" else txn.error_reason,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mpesa/pay/platform-invoice")
async def pay_platform_invoice(
    payload: PlatformInvoicePaymentInput,
    current_user=Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate STK push for ISP's platform invoice payment.
    Uses platform M-Pesa credentials (not ISP's).
    """
    from app.services.daraja_service import initiate_stk_push
    from app.models.mpesa_transaction import MpesaTransaction
    from app.models.mpesa_config import MpesaConfig

    tenant_id = UUID(str(current_user.tenant_id))

    if not settings.MPESA_CONSUMER_KEY or not settings.MPESA_CONSUMER_SECRET:
        raise HTTPException(status_code=400, detail="Platform M-Pesa not configured. Please contact support.")

    # Get or create platform M-Pesa config (tenant_id=NULL = platform-level)
    result = await db.execute(
        select(MpesaConfig).where(MpesaConfig.tenant_id.is_(None)).limit(1)
    )
    platform_cfg = result.scalar_one_or_none()

    if not platform_cfg:
        from app.services.crypto_service import encrypt as enc
        platform_cfg = MpesaConfig(
            id=uuid.uuid4(),
            tenant_id=None,
            consumer_key_enc=enc(settings.MPESA_CONSUMER_KEY),
            consumer_secret_enc=enc(settings.MPESA_CONSUMER_SECRET),
            shortcode=settings.MPESA_SHORTCODE,
            passkey_enc=enc(settings.MPESA_PASSKEY),
            account_reference="XwB-PLATFORM",
            is_active=True,
            is_verified=True,
            status="configured",
        )
        db.add(platform_cfg)
        await db.flush()

    callback_url = settings.MPESA_CALLBACK_URL or "https://pay.honestbill.co.ke/api/mpesa/callback"

    txn = MpesaTransaction(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        mpesa_config_id=platform_cfg.id,
        amount_ksh=Decimal(str(payload.amount_ksh)),
        phone_number=payload.phone_number,
        payment_type="invoice",
        status="pending",
        reference_id=tenant_id,
    )
    db.add(txn)
    await db.flush()

    try:
        result = await initiate_stk_push(
            consumer_key_enc=platform_cfg.consumer_key_enc,
            consumer_secret_enc=platform_cfg.consumer_secret_enc,
            shortcode=platform_cfg.shortcode,
            passkey_enc=platform_cfg.passkey_enc,
            phone_number=payload.phone_number,
            amount=Decimal(str(payload.amount_ksh)),
            account_reference=f"INV-{str(tenant_id)[:8]}",
            description="Invoice Payment",
            callback_url=callback_url,
        )

        txn.merchant_request_id = result.get("MerchantRequestID")
        txn.checkout_request_id = result.get("CheckoutRequestID")
        txn.response_code = result.get("ResponseCode")
        txn.response_description = result.get("ResponseDescription")
        txn.status = "processing" if result.get("ResponseCode") == "0" else "failed"

    except Exception as e:
        txn.status = "failed"
        txn.error_reason = str(e)
        logger.error(f"Platform invoice STK push failed: {e}")

    await db.commit()

    return {
        "success": txn.status == "processing",
        "checkout_request_id": txn.checkout_request_id,
        "status": txn.status,
        "message": "Check your phone for M-Pesa prompt" if txn.status == "processing" else ("Payment failed: " + (txn.error_reason or "unknown error")),
    }


@router.get("/mpesa/status/{checkout_request_id}")
async def poll_payment_status(
    checkout_request_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Poll payment status. Frontend calls this every 2 seconds.
    No auth required -- frontend needs this from portal context too.
    """
    status = await get_transaction_status(checkout_request_id, db)
    return status


# ============================================================================
# DARAJA CALLBACK (Public -- called by Safaricom servers)
# ============================================================================

@router.post("/mpesa/callback")
async def mpesa_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive payment callback from Daraja.
    This URL must be publicly accessible (use ngrok for local dev).
    """
    try:
        body = await request.json()
        logger.info(f"M-Pesa callback received: {body}")
        success = await process_callback(body, db)
        # Always return 200 to Daraja even on error, so they don't retry endlessly
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    except Exception as e:
        logger.error(f"Callback error: {e}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.get("/mpesa/admin/transactions")
async def admin_list_transactions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """ADMIN: List all M-Pesa transactions."""
    role = getattr(current_user, "role", None)
    if role not in ("platform_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin only")

    from app.models.mpesa_transaction import MpesaTransaction
    result = await db.execute(
        select(MpesaTransaction).order_by(MpesaTransaction.created_at.desc()).limit(100)
    )
    txns = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "tenant_id": str(t.tenant_id),
            "amount_ksh": float(t.amount_ksh),
            "phone_number": t.phone_number,
            "payment_type": t.payment_type,
            "status": t.status,
            "mpesa_receipt": t.mpesa_receipt_number,
            "created_at": t.created_at.isoformat(),
        }
        for t in txns
    ]