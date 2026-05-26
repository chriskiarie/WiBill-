from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid
import logging

from app.core.database import get_db, AsyncSessionLocal
from app.core.config import settings
from app.models.session import Session, SessionStatus
from app.models.package import Package
from app.models.transaction import Transaction
from app.models.mpesa_callback import MpesaCallback
from app.services.daraja_service import initiate_stk_push, extract_callback_data
from app.services.session_service import create_pending_session, activate_session
from app.services import mikrotik_service

router = APIRouter()
logger = logging.getLogger("honestbill.mpesa")


class PaymentRequest(BaseModel):
    tenant_id: str
    package_id: str
    mac_address: str
    ip_address: str
    phone_number: str


@router.post("/pay")
async def initiate_payment(
    data: PaymentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Initiate M-Pesa STK Push. Called by captive portal when user hits PAY."""
    tenant_id = uuid.UUID(data.tenant_id)
    package_id = uuid.UUID(data.package_id)

    # Get package
    pkg_result = await db.execute(
        select(Package).where(
            Package.id == package_id,
            Package.tenant_id == tenant_id,
            Package.is_active == True,
        )
    )
    package = pkg_result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    # Create pending session
    session = await create_pending_session(
        tenant_id=tenant_id,
        package_id=package_id,
        mac_address=data.mac_address,
        ip_address=data.ip_address,
        phone_number=data.phone_number,
        db=db,
    )

    base_url = str(request.base_url).rstrip("/")

    stk_result = await initiate_stk_push(
        tenant_id=tenant_id,
        phone_number=data.phone_number,
        amount=int(package.price_ksh),
        session_id=str(session.id),
        package_name=package.name,
        callback_base_url=base_url,
        db=db,
    )

    if not stk_result["success"]:
        session.status = SessionStatus.FAILED
        await db.commit()
        raise HTTPException(status_code=502, detail=stk_result.get("error", "STK Push failed"))

    session.checkout_request_id = stk_result["checkout_request_id"]
    await db.commit()

    logger.info(f"STK Push sent | session={session.id} | checkout={session.checkout_request_id}")

    return {
        "session_id": str(session.id),
        "checkout_request_id": stk_result["checkout_request_id"],
        "message": "Check your phone for M-Pesa prompt",
    }


@router.post("/callback/{tenant_id}")
async def mpesa_callback(
    tenant_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Safaricom calls this after user pays or cancels."""
    # Verify source IP in production
    client_ip = request.client.host
    if settings.APP_ENV == "production" and client_ip not in settings.SAFARICOM_IPS:
        logger.warning(f"Callback from non-Safaricom IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await request.json()
    t_id = uuid.UUID(tenant_id)
    parsed = extract_callback_data(body)

    # Log raw callback — always, even failures
    callback_log = MpesaCallback(
        tenant_id=t_id,
        checkout_request_id=parsed.get("checkout_request_id", ""),
        result_code=parsed.get("result_code", -1),
        result_desc=parsed.get("result_desc", ""),
        raw_payload=body,
    )
    db.add(callback_log)
    await db.commit()

    if not parsed["success"]:
        # Mark session failed
        if parsed.get("checkout_request_id"):
            sess_result = await db.execute(
                select(Session).where(
                    Session.checkout_request_id == parsed["checkout_request_id"]
                )
            )
            session = sess_result.scalar_one_or_none()
            if session:
                session.status = SessionStatus.FAILED
                await db.commit()
        logger.info(f"Payment failed: {parsed.get('result_desc')}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    # Payment successful — extract data
    checkout_id = parsed["checkout_request_id"]
    receipt = parsed["receipt"]
    amount = float(parsed["amount"])

    # Find session
    sess_result = await db.execute(
        select(Session).where(Session.checkout_request_id == checkout_id)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        logger.error(f"No session for checkout {checkout_id}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    # Idempotency — receipt must be unique
    existing_tx = await db.execute(
        select(Transaction).where(Transaction.mpesa_receipt == receipt)
    )
    if existing_tx.scalar_one_or_none():
        logger.warning(f"Duplicate receipt {receipt} — ignoring")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    # Get package
    pkg_result = await db.execute(select(Package).where(Package.id == session.package_id))
    package = pkg_result.scalar_one_or_none()

    # Activate session + record transaction
    session = await activate_session(session, package, receipt, amount, db)

    # Authorize MikroTik in background with its own DB session
    tenant_id_val = session.tenant_id
    mac = session.mac_address
    phone = session.phone_number
    duration = package.duration_hours
    session_id_str = str(session.id)

    async def _authorize_mikrotik():
        async with AsyncSessionLocal() as new_db:
            await mikrotik_service.add_hotspot_user(
                tenant_id_val, mac, phone, duration, session_id_str, new_db
            )

    background_tasks.add_task(_authorize_mikrotik)

    logger.info(f"Payment confirmed | receipt={receipt} | MAC={mac}")
    return {"ResultCode": 0, "ResultDesc": "Accepted"}