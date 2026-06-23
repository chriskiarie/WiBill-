"""
app/services/system_state.py — System State Resolver

The truth engine for the entire platform.
Reconstructs real-world state from event + DB state reconciliation.
"""
from datetime import datetime, timedelta, timezone
import uuid
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.session import Session
from app.models.transaction import Transaction, TransactionStatus
from app.models.mpesa_callback import MpesaCallback
from app.models.mpesa_transaction import MpesaTransaction, MpesaTransactionStatus
from app.models.mikrotik_active_user import MikrotikActiveUser
from app.models.mikrotik_config import MikrotikConfig
from app.models.network_event import NetworkEvent

log = logging.getLogger("honestbill.system_state")

PROVISIONING_TIMEOUT_SECONDS = 120


async def resolve_session_state(session_id: str, db: AsyncSession) -> dict:
    """Resolve complete state for a single session."""
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        return _error_result("INVALID_SESSION_ID", "Session ID is not a valid UUID")
    result = await db.execute(select(Session).where(Session.id == sid))
    session = result.scalar_one_or_none()
    if not session:
        return _error_result("INVALID_SESSION", "Session does not exist")
    tenant_id = str(session.tenant_id)

    payment_state, payment_evidence, payment_ts = await _resolve_payment(session, db)
    provisioning_state, prov_evidence, prov_ts = await _resolve_provisioning(session, payment_state, db)
    router_state, router_evidence = await _resolve_router(tenant_id, db)

    session_state, blocking_reason, summary, risk = _derive_final_state(
        session, payment_state, provisioning_state, router_state
    )

    return {
        "session_id": session_id,
        "tenant_id": tenant_id,
        "session_state": session_state,
        "payment_state": payment_state,
        "provisioning_state": provisioning_state,
        "router_state": router_state,
        "readable_summary": summary,
        "blocking_reason": blocking_reason,
        "timestamps": {
            "created_at": _iso(session.created_at),
            "paid_at": payment_ts.get("paid_at"),
            "provisioned_at": prov_ts.get("provisioned_at"),
            "last_checked": datetime.now(timezone.utc).isoformat(),
        },
        "evidence": {
            "transaction_id": payment_evidence.get("transaction_id"),
            "mpesa_receipt": payment_evidence.get("mpesa_receipt"),
            "callback_id": payment_evidence.get("callback_id"),
            "mikrotik_user": prov_evidence.get("mikrotik_user"),
        },
        "risk_level": risk,
    }


async def resolve_sessions_batch(session_ids: list[str], db: AsyncSession) -> list[dict]:
    """Resolve state for multiple sessions."""
    results = []
    for sid in session_ids:
        try:
            state = await resolve_session_state(sid, db)
            results.append(state)
        except Exception as e:
            log.warning(f"Failed to resolve session {sid}: {e}")
            results.append(_error_result("RESOLVE_ERROR", str(e)))
    return results


async def _resolve_payment(session: Session, db: AsyncSession) -> tuple:
    evidence, timestamps = {}, {}
    txn_result = await db.execute(
        select(Transaction).where(Transaction.session_id == session.id)
    )
    txn = txn_result.scalar_one_or_none()

    mpesa_txn = None
    if session.checkout_request_id:
        m_result = await db.execute(
            select(MpesaTransaction).where(
                MpesaTransaction.checkout_request_id == session.checkout_request_id
            )
        )
        mpesa_txn = m_result.scalar_one_or_none()

    callback = None
    if session.checkout_request_id:
        cb_result = await db.execute(
            select(MpesaCallback).where(
                MpesaCallback.checkout_request_id == session.checkout_request_id
            )
        )
        callback = cb_result.scalar_one_or_none()

    if txn:
        evidence["transaction_id"] = str(txn.id)
        evidence["mpesa_receipt"] = txn.mpesa_receipt
    if callback:
        evidence["callback_id"] = str(callback.id)

    if txn and txn.status == TransactionStatus.SUCCESS:
        timestamps["paid_at"] = _iso(txn.confirmed_at)
        return "PAID", evidence, timestamps
    if callback and callback.result_code == 0:
        return "PAID", evidence, timestamps
    if callback and callback.result_code != 0:
        return "FAILED", evidence, timestamps
    if mpesa_txn:
        if mpesa_txn.status == MpesaTransactionStatus.SUCCESS:
            return "PAID", evidence, timestamps
        if mpesa_txn.status in (MpesaTransactionStatus.PROCESSING, MpesaTransactionStatus.PENDING):
            return "PENDING", evidence, timestamps
        if mpesa_txn.status in (MpesaTransactionStatus.FAILED, MpesaTransactionStatus.CANCELLED, MpesaTransactionStatus.EXPIRED):
            return "FAILED", evidence, timestamps
    if txn and txn.status == TransactionStatus.PENDING:
        return "PENDING", evidence, timestamps
    if txn and txn.status == TransactionStatus.FAILED:
        return "FAILED", evidence, timestamps
    return "NO_PAYMENT", evidence, timestamps


async def _resolve_provisioning(session: Session, payment_state: str, db: AsyncSession) -> tuple:
    evidence, timestamps = {}, {}
    if payment_state != "PAID":
        return "BLOCKED_NO_PAYMENT", evidence, timestamps

    user_result = await db.execute(
        select(MikrotikActiveUser).where(MikrotikActiveUser.session_id == session.id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        evidence["mikrotik_user"] = user.username_on_router or str(user.id)
        timestamps["provisioned_at"] = _iso(user.activated_at)
        return "PROVISIONED", evidence, timestamps
    if session.status == "active":
        evidence["mikrotik_user"] = session.mikrotik_user_id or "session_marked_active"
        timestamps["provisioned_at"] = _iso(session.activated_at)
        return "PROVISIONED", evidence, timestamps
    if session.status in ("pending_payment", "pending") and session.checkout_request_id:
        cb_result = await db.execute(
            select(MpesaCallback).where(
                MpesaCallback.checkout_request_id == session.checkout_request_id,
                MpesaCallback.result_code == 0,
            )
        )
        success_callback = cb_result.scalar_one_or_none()
        if success_callback:
            cb_time = _ensure_tz(success_callback.received_at)
            if (datetime.now(timezone.utc) - cb_time).total_seconds() > PROVISIONING_TIMEOUT_SECONDS:
                return "FAILED", evidence, timestamps
            return "PROVISIONING", evidence, timestamps
    return "PROVISIONING", evidence, timestamps


async def _resolve_router(tenant_id: str, db: AsyncSession) -> tuple:
    evidence = {}
    router_result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == uuid.UUID(tenant_id))
    )
    router = router_result.scalar_one_or_none()
    if not router:
        return "NOT_CONFIGURED", evidence
    evidence["router_ip"] = router.router_ip
    evidence["router_status"] = router.status
    if router.status in ("ONLINE", "CONNECTED"):
        net_result = await db.execute(
            select(NetworkEvent)
            .where(NetworkEvent.tenant_id == uuid.UUID(tenant_id))
            .order_by(desc(NetworkEvent.checked_at))
            .limit(1)
        )
        latest_net = net_result.scalar_one_or_none()
        if latest_net and latest_net.status == "down":
            net_time = _ensure_tz(latest_net.checked_at)
            if (datetime.now(timezone.utc) - net_time).total_seconds() < 300:
                return "ONLINE_BUT_NETWORK_DOWN", evidence
        return "ONLINE", evidence
    if router.status in ("DISCONNECTED", "OFFLINE"):
        return "OFFLINE", evidence
    if router.status == "AUTH_FAILED":
        return "AUTH_FAILED", evidence
    return router.status, evidence


def _derive_final_state(session, payment_state, provisioning_state, router_state):
    now = datetime.now(timezone.utc)
    session_expiry = _ensure_tz(session.expires_at)

    if session.status == "expired" or session_expiry < now:
        return "EXPIRED", "SESSION_EXPIRED", "Session has expired", "LOW"
    if session.status == "disconnected":
        return "DISCONNECTED", "SESSION_DISCONNECTED", "Session was disconnected", "LOW"
    if session.status == "failed":
        return "FAILED", "SESSION_FAILED", "Session encountered a failure", "HIGH"

    if payment_state == "NO_PAYMENT":
        return "WAITING_PAYMENT", "NONE", "Customer has not yet made a payment", "LOW"
    if payment_state == "PENDING":
        return "WAITING_PAYMENT", "PAYMENT_PENDING", "Payment is pending confirmation", "MEDIUM"
    if payment_state == "FAILED":
        return "FAILED_PAYMENT", "PAYMENT_FAILED", "Payment failed, no internet session created", "HIGH"

    if payment_state == "PAID":
        if provisioning_state == "BLOCKED_NO_PAYMENT":
            return "PAYMENT_RECEIVED_BUT_NOT_PROVISIONED", "PROVISIONING_NOT_STARTED", "Customer paid but internet is not active yet", "MEDIUM"
        if provisioning_state == "PROVISIONING":
            return "PROVISIONING", "PROVISIONING_IN_PROGRESS", "Payment confirmed, internet is being activated", "MEDIUM"
        if provisioning_state == "FAILED":
            return "PAYMENT_RECEIVED_BUT_NOT_PROVISIONED", "PROVISIONING_FAILED", "Customer paid but provisioning failed", "CRITICAL"
        if provisioning_state == "PROVISIONED":
            if router_state == "OFFLINE":
                return "ACTIVE_BUT_NETWORK_DOWN", "ROUTER_OFFLINE", "Customer is connected but the router is offline", "CRITICAL"
            if router_state == "AUTH_FAILED":
                return "ACTIVE_BUT_NETWORK_DOWN", "ROUTER_AUTH_FAILED", "Customer is connected but router authentication failed", "CRITICAL"
            return "ACTIVE", "NONE", "Customer is actively connected and router is online", "LOW"

    return "UNKNOWN", "UNKNOWN_STATE", "Unable to determine session state", "MEDIUM"


def _iso(dt):
    if dt is None:
        return None
    if hasattr(dt, 'isoformat'):
        return dt.isoformat()
    return str(dt)


def _ensure_tz(dt):
    if dt is None:
        return datetime.now(timezone.utc)
    if hasattr(dt, 'tzinfo') and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _error_result(state, reason):
    return {
        "session_id": None,
        "tenant_id": None,
        "session_state": state,
        "payment_state": "UNKNOWN",
        "provisioning_state": "UNKNOWN",
        "router_state": "UNKNOWN",
        "readable_summary": reason,
        "blocking_reason": state,
        "timestamps": {"last_checked": datetime.now(timezone.utc).isoformat()},
        "evidence": {},
        "risk_level": "HIGH",
    }
