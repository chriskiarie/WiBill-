"""
app/api/routes/batcave.py — Batcave truth endpoints

Phase 1 operations center endpoints.
Every number comes from real DB queries — no mock data.
"""
from datetime import datetime, timedelta, timezone
import uuid
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.api.routes.auth import require_platform_admin
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.session import Session
from app.models.transaction import Transaction, TransactionStatus
from app.models.mpesa_transaction import MpesaTransaction, MpesaTransactionStatus
from app.models.mpesa_config import MpesaConfig
from app.models.mikrotik_config import MikrotikConfig
from app.models.mikrotik_active_user import MikrotikActiveUser
from app.models.network_event import NetworkEvent
from app.models.package import Package
from app.models.audit_log import AuditLog
from app.services.system_state import resolve_session_state

router = APIRouter(tags=["batcave"])
log = logging.getLogger("honestbill.batcave")


@router.get("/admin/executive-summary")
async def executive_summary(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide executive summary from real DB queries."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    five_min_ago = now - timedelta(minutes=5)
    yesterday = now - timedelta(hours=24)

    # ── MONEY LAYER ──
    rev_today = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0))
        .where(Transaction.status == TransactionStatus.SUCCESS, Transaction.created_at >= today_start)
    )
    rev_month = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0))
        .where(Transaction.status == TransactionStatus.SUCCESS, Transaction.created_at >= month_start)
    )
    fees_today = await db.execute(
        select(func.coalesce(func.sum(Transaction.platform_fee_ksh), 0))
        .where(Transaction.status == TransactionStatus.SUCCESS, Transaction.created_at >= today_start)
    )
    failed_today = await db.execute(
        select(func.count(Transaction.id))
        .where(Transaction.status == TransactionStatus.FAILED, Transaction.created_at >= today_start)
    )
    pending_p = await db.execute(
        select(func.count(Transaction.id)).where(Transaction.status == TransactionStatus.PENDING)
    )

    # ── OPERATION LAYER ──
    active_s = await db.execute(select(func.count(Session.id)).where(Session.status == "active"))
    pending_prov = await db.execute(
        select(func.count(Session.id)).where(
            Session.status == "pending_payment",
            Session.checkout_request_id.isnot(None),
            Session.created_at >= today_start,
        )
    )
    failed_prov = await db.execute(
        select(func.count(Session.id)).where(Session.status == "failed", Session.created_at >= today_start)
    )
    expired_s = await db.execute(select(func.count(Session.id)).where(Session.status == "expired"))

    # ── ISP LAYER ──
    total_i = await db.execute(select(func.count(Tenant.id)))
    active_i = await db.execute(select(func.count(Tenant.id)).where(Tenant.is_active == True))
    locked_i = await db.execute(select(func.count(Tenant.id)).where(Tenant.is_locked == True))
    pending_i = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.is_active == False, Tenant.is_locked == False)
    )

    # ── NETWORK LAYER ──
    online_subq = (
        select(NetworkEvent.tenant_id)
        .where(NetworkEvent.status == "up", NetworkEvent.checked_at >= five_min_ago)
        .distinct().subquery()
    )
    online_count = await db.execute(select(func.count()).select_from(online_subq))
    offline_subq = (
        select(NetworkEvent.tenant_id)
        .where(NetworkEvent.status == "down", NetworkEvent.checked_at >= five_min_ago)
        .distinct().subquery()
    )
    offline_count = await db.execute(select(func.count()).select_from(offline_subq))

    up_events = await db.execute(
        select(func.count(NetworkEvent.id))
        .where(NetworkEvent.status == "up", NetworkEvent.checked_at >= yesterday)
    )
    total_events = await db.execute(
        select(func.count(NetworkEvent.id)).where(NetworkEvent.checked_at >= yesterday)
    )
    up_count = up_events.scalar() or 0
    total_count = total_events.scalar() or 1

    # ── SYSTEM HEALTH ──
    health = await _compute_system_health(db, now, five_min_ago)

    return {
        "system_health": health,
        "money_layer": {
            "revenue_today_ksh": float(rev_today.scalar() or 0),
            "revenue_month_ksh": float(rev_month.scalar() or 0),
            "platform_fees_today_ksh": float(fees_today.scalar() or 0),
            "failed_payments_today": failed_today.scalar() or 0,
            "pending_payments": pending_p.scalar() or 0,
        },
        "operation_layer": {
            "active_sessions": active_s.scalar() or 0,
            "pending_provisioning": pending_prov.scalar() or 0,
            "failed_provisioning_today": failed_prov.scalar() or 0,
            "expired_sessions": expired_s.scalar() or 0,
        },
        "isp_layer": {
            "total_isps": total_i.scalar() or 0,
            "active_isps": active_i.scalar() or 0,
            "locked_isps": locked_i.scalar() or 0,
            "pending_approval_isps": pending_i.scalar() or 0,
        },
        "network_layer": {
            "online_isps": online_count.scalar() or 0,
            "offline_isps": offline_count.scalar() or 0,
            "avg_uptime_pct": round((up_count / total_count) * 100, 1) if total_count > 1 else (100.0 if up_count > 0 else 0.0),
        },
    }


async def _compute_system_health(db: AsyncSession, now: datetime, five_min_ago: datetime) -> dict:
    # Payment System: OK if recent success rate >= 80%
    recent_txns = await db.execute(
        select(func.count(Transaction.id))
        .where(Transaction.created_at >= five_min_ago)
    )
    recent_ok = await db.execute(
        select(func.count(Transaction.id))
        .where(Transaction.status == TransactionStatus.SUCCESS, Transaction.created_at >= five_min_ago)
    )
    total_recent = recent_txns.scalar() or 0
    ok_recent = recent_ok.scalar() or 0
    if total_recent == 0:
        payment_status = "OK"
    elif (ok_recent / total_recent) >= 0.8:
        payment_status = "OK"
    elif (ok_recent / total_recent) >= 0.5:
        payment_status = "DEGRADED"
    else:
        payment_status = "DOWN"

    # Router System: OK if at least one router is ONLINE, DEGRADED if configured but none reachable
    total_routers = await db.execute(
        select(func.count(MikrotikConfig.id))
    )
    online_routers = await db.execute(
        select(func.count(MikrotikConfig.id)).where(MikrotikConfig.status == "ONLINE")
    )
    t_r = total_routers.scalar() or 0
    o_r = online_routers.scalar() or 0
    if t_r == 0:
        router_status = "DEGRADED"
    elif o_r == t_r:
        router_status = "OK"
    elif o_r > 0:
        router_status = "DEGRADED"
    else:
        router_status = "DOWN"

    # M-Pesa Callback System: OK if recent callbacks being processed
    recent_callbacks = await db.execute(
        select(func.count(MpesaTransaction.id))
        .where(MpesaTransaction.created_at >= five_min_ago)
    )
    stuck_callbacks = await db.execute(
        select(func.count(MpesaTransaction.id))
        .where(
            MpesaTransaction.status == MpesaTransactionStatus.PROCESSING,
            MpesaTransaction.created_at < (now - timedelta(minutes=3)),
        )
    )
    cb_count = recent_callbacks.scalar() or 0
    stuck_count = stuck_callbacks.scalar() or 0
    if cb_count == 0:
        callback_status = "OK"
    elif stuck_count > cb_count * 0.5:
        callback_status = "DELAYED"
    elif stuck_count > 0:
        callback_status = "DEGRADED"
    else:
        callback_status = "OK"

    # Session Provisioning
    recent_prov = await db.execute(
        select(func.count(Session.id))
        .where(Session.created_at >= five_min_ago)
    )
    prov_failures = await db.execute(
        select(func.count(Session.id))
        .where(Session.status == "failed", Session.created_at >= five_min_ago)
    )
    rp = recent_prov.scalar() or 0
    pf = prov_failures.scalar() or 0
    if rp == 0:
        prov_status = "OK"
    elif pf > rp * 0.5:
        prov_status = "FAILING"
    elif pf > 0:
        prov_status = "BACKLOGGED"
    else:
        prov_status = "OK"

    # Network Monitoring
    net_events = await db.execute(
        select(func.count(NetworkEvent.id))
        .where(NetworkEvent.checked_at >= five_min_ago)
    )
    ne = net_events.scalar() or 0
    net_status = "OK" if ne > 0 else "BLIND"

    return {
        "payment_system": payment_status,
        "router_system": router_status,
        "mpesa_callback_system": callback_status,
        "session_provisioning": prov_status,
        "network_monitoring": net_status,
    }


@router.get("/admin/alerts")
async def alerts_feed(
    limit: int = Query(20, ge=1, le=100),
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Critical alerts feed.
    4 types: PAYMENT_RECEIVED_BUT_NOT_PROVISIONED, ROUTER_OFFLINE,
             M_PESA_CALLBACK_FAILED, SESSION_STUCK_PENDING
    """
    now = datetime.now(timezone.utc)
    alerts = []

    # 1. PAYMENT_RECEIVED_BUT_NOT_PROVISIONED — sessions that are active but no mikrotik_active_user
    # or sessions where callback succeeded but session still pending_payment beyond timeout
    timeout_threshold = now - timedelta(seconds=120)
    orphan_sessions = await db.execute(
        select(Session)
        .where(
            Session.status.in_(["active", "pending_payment"]),
            Session.checkout_request_id.isnot(None),
            Session.created_at < timeout_threshold,
        )
        .order_by(desc(Session.created_at))
        .limit(limit)
    )
    for s in orphan_sessions.scalars().all():
        # Check if there's a mikrotik_active_user
        mau = await db.execute(
            select(func.count(MikrotikActiveUser.id))
            .where(MikrotikActiveUser.session_id == s.id)
        )
        has_user = (mau.scalar() or 0) > 0

        if s.status == "active" and not has_user:
            tenant = await db.execute(select(Tenant).where(Tenant.id == s.tenant_id))
            t = tenant.scalar_one_or_none()
            alerts.append({
                "type": "PAYMENT_RECEIVED_BUT_NOT_PROVISIONED",
                "severity": "CRITICAL",
                "message": f"Session {str(s.id)[:8]} marked active but no MikroTik user provisioned",
                "tenant_name": t.name if t else "unknown",
                "tenant_id": str(s.tenant_id),
                "session_id": str(s.id),
                "created_at": _iso_dt(s.created_at),
            })

    # 2. ROUTER_OFFLINE — routers with DISCONNECTED/OFFLINE status
    offline_routers = await db.execute(
        select(MikrotikConfig)
        .where(MikrotikConfig.status.in_(["DISCONNECTED", "OFFLINE"]))
        .order_by(desc(MikrotikConfig.updated_at))
        .limit(limit)
    )
    for r in offline_routers.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == r.tenant_id))
        t = tenant.scalar_one_or_none()
        alerts.append({
            "type": "ROUTER_OFFLINE",
            "severity": "HIGH",
            "message": f"Router {r.router_ip} is {r.status}",
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(r.tenant_id),
            "session_id": None,
            "created_at": _iso_dt(r.updated_at) if r.updated_at else _iso_dt(now),
        })

    # 3. M_PESA_CALLBACK_FAILED — failed callbacks
    failed_callbacks = await db.execute(
        select(MpesaTransaction)
        .where(
            MpesaTransaction.status == MpesaTransactionStatus.FAILED,
            MpesaTransaction.created_at >= (now - timedelta(hours=24)),
        )
        .order_by(desc(MpesaTransaction.created_at))
        .limit(limit)
    )
    for mt in failed_callbacks.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == mt.tenant_id))
        t = tenant.scalar_one_or_none()
        alerts.append({
            "type": "M_PESA_CALLBACK_FAILED",
            "severity": "HIGH",
            "message": f"Payment of KES {float(mt.amount_ksh):.0f} from {mt.phone_number} failed: {mt.result_description or mt.error_reason or 'unknown'}",
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(mt.tenant_id),
            "session_id": str(mt.reference_id) if mt.reference_id else None,
            "created_at": _iso_dt(mt.created_at),
        })

    # 4. SESSION_STUCK_PENDING — sessions stuck in pending_payment longer than normal
    stuck_sessions = await db.execute(
        select(Session)
        .where(
            Session.status == "pending_payment",
            Session.created_at < (now - timedelta(minutes=10)),
        )
        .order_by(desc(Session.created_at))
        .limit(limit)
    )
    for s in stuck_sessions.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == s.tenant_id))
        t = tenant.scalar_one_or_none()
        alerts.append({
            "type": "SESSION_STUCK_PENDING",
            "severity": "MEDIUM",
            "message": f"Session {str(s.id)[:8]} stuck in pending_payment for {(now - _ensure_tz(s.created_at)).seconds // 60}m",
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(s.tenant_id),
            "session_id": str(s.id),
            "created_at": _iso_dt(s.created_at),
        })

    alerts.sort(key=lambda a: a["created_at"], reverse=True)
    return alerts[:limit]


@router.get("/admin/operations")
async def operations_center(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Operations Center — all queues for production debugging at 2AM.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    five_min_ago = now - timedelta(minutes=5)

    # ── PAYMENTS QUEUE ──
    payments_result = await db.execute(
        select(MpesaTransaction)
        .where(MpesaTransaction.created_at >= today_start)
        .order_by(desc(MpesaTransaction.created_at))
        .limit(50)
    )
    payments_queue = []
    for mt in payments_result.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == mt.tenant_id))
        t = tenant.scalar_one_or_none()
        has_callback = mt.is_processed
        session_status = None
        if mt.payment_type == "session" and mt.reference_id:
            sess = await db.execute(select(Session).where(Session.id == mt.reference_id))
            s = sess.scalar_one_or_none()
            session_status = s.status if s else None
        payments_queue.append({
            "id": str(mt.id),
            "phone": mt.phone_number,
            "amount_ksh": float(mt.amount_ksh),
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(mt.tenant_id),
            "status": mt.status.value if hasattr(mt.status, 'value') else mt.status,
            "has_callback": has_callback,
            "mpesa_receipt": mt.mpesa_receipt_number,
            "session_status": session_status,
            "payment_type": mt.payment_type.value if hasattr(mt.payment_type, 'value') else mt.payment_type,
            "created_at": _iso_dt(mt.created_at),
            "checkout_request_id": mt.checkout_request_id,
        })

    # ── PROVISIONING QUEUE ──
    prov_result = await db.execute(
        select(Session)
        .where(
            Session.status.in_(["pending_payment", "active"]),
            Session.created_at >= today_start,
        )
        .order_by(desc(Session.created_at))
        .limit(50)
    )
    provisioning_queue = []
    for s in prov_result.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == s.tenant_id))
        t = tenant.scalar_one_or_none()
        has_router_user = False
        if s.id:
            mau = await db.execute(
                select(func.count(MikrotikActiveUser.id))
                .where(MikrotikActiveUser.session_id == s.id)
            )
            has_router_user = (mau.scalar() or 0) > 0
        # Determine provisioning status
        if s.status == "active" and has_router_user:
            prov_status = "ACTIVE"
        elif s.status == "active" and not has_router_user:
            prov_status = "ACTIVE_NO_USER"
        elif s.checkout_request_id and s.created_at:
            age = (now - _ensure_tz(s.created_at)).total_seconds()
            if age > 120:
                prov_status = "STUCK"
            else:
                prov_status = "PROVISIONING"
        else:
            prov_status = "WAITING"

        provisioning_queue.append({
            "session_id": str(s.id),
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(s.tenant_id),
            "mac_address": s.mac_address,
            "phone": s.phone_number,
            "status": s.status,
            "provisioning_status": prov_status,
            "has_router_user": has_router_user,
            "created_at": _iso_dt(s.created_at),
        })

    # ── SESSION QUEUE ──
    sessions_q = await db.execute(
        select(Session)
        .order_by(desc(Session.created_at))
        .limit(50)
    )
    session_queue = []
    for s in sessions_q.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == s.tenant_id))
        t = tenant.scalar_one_or_none()
        session_queue.append({
            "session_id": str(s.id),
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(s.tenant_id),
            "mac_address": s.mac_address,
            "phone": s.phone_number,
            "status": s.status,
            "created_at": _iso_dt(s.created_at),
            "expires_at": _iso_dt(s.expires_at),
            "activated_at": _iso_dt(s.activated_at),
            "has_checkout": s.checkout_request_id is not None,
        })

    # ── ROUTER HEALTH ──
    routers_q = await db.execute(select(MikrotikConfig).order_by(MikrotikConfig.updated_at.desc()))
    router_health = []
    for r in routers_q.scalars().all():
        tenant = await db.execute(select(Tenant).where(Tenant.id == r.tenant_id))
        t = tenant.scalar_one_or_none()
        latest_net = None
        net_result = await db.execute(
            select(NetworkEvent)
            .where(NetworkEvent.tenant_id == r.tenant_id)
            .order_by(desc(NetworkEvent.checked_at))
            .limit(1)
        )
        latest_net = net_result.scalar_one_or_none()

        router_health.append({
            "tenant_name": t.name if t else "unknown",
            "tenant_id": str(r.tenant_id),
            "router_ip": r.router_ip,
            "status": r.status,
            "last_error": r.last_error_message,
            "last_connected": _iso_dt(r.last_connected_at),
            "latest_network_status": latest_net.status if latest_net else "UNKNOWN",
            "latest_ping_at": _iso_dt(latest_net.checked_at) if latest_net else None,
        })

    # ── NETWORK HEALTH ──
    tenants = await db.execute(select(Tenant).where(Tenant.is_active == True))
    network_health = []
    for t in tenants.scalars().all():
        latest = await db.execute(
            select(NetworkEvent)
            .where(NetworkEvent.tenant_id == t.id)
            .order_by(desc(NetworkEvent.checked_at))
            .limit(1)
        )
        le = latest.scalar_one_or_none()
        five_min_count = await db.execute(
            select(func.count(NetworkEvent.id))
            .where(
                NetworkEvent.tenant_id == t.id,
                NetworkEvent.checked_at >= five_min_ago,
                NetworkEvent.status == "down",
            )
        )
        recent_downs = five_min_count.scalar() or 0

        if not le:
            net_status = "UNKNOWN"
        elif le.status == "up" and recent_downs == 0:
            net_status = "UP"
        elif le.status == "up" and recent_downs > 0:
            net_status = "DEGRADED"
        elif le.status == "down":
            net_status = "DOWN"
        else:
            net_status = le.status.upper()

        network_health.append({
            "tenant_name": t.name,
            "tenant_id": str(t.id),
            "status": net_status,
            "last_checked": _iso_dt(le.checked_at) if le else None,
            "recent_downs_5min": recent_downs,
        })

    return {
        "payments_queue": payments_queue,
        "provisioning_queue": provisioning_queue,
        "session_queue": session_queue,
        "router_health": router_health,
        "network_health": network_health,
    }


@router.get("/admin/sessions/{session_id}/resolve")
async def resolve_session(
    session_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a single session's state using the System State Resolver."""
    return await resolve_session_state(session_id, db)


@router.get("/admin/isp/{tenant_id}/readiness")
async def isp_readiness(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Compute readiness score (0–100) for a single ISP from real conditions."""
    try:
        tid = uuid.UUID(tenant_id)
    except ValueError:
        return {"error": "Invalid tenant ID"}
    tenant = await db.execute(select(Tenant).where(Tenant.id == tid))
    t = tenant.scalar_one_or_none()
    if not t:
        return {"error": "Tenant not found"}

    score = 0
    checks = {}

    # is_active → +15
    if t.is_active:
        score += 15
        checks["is_active"] = {"pass": True, "weight": 15}
    else:
        checks["is_active"] = {"pass": False, "weight": 15}

    # not is_locked → +15
    if not t.is_locked:
        score += 15
        checks["not_locked"] = {"pass": True, "weight": 15}
    else:
        checks["not_locked"] = {"pass": False, "weight": 15, "reason": t.locked_reason}

    # packages exist → +15
    pkg_count = await db.execute(
        select(func.count(Package.id)).where(Package.tenant_id == tid, Package.is_active == True)
    )
    has_packages = (pkg_count.scalar() or 0) > 0
    if has_packages:
        score += 15
        checks["has_packages"] = {"pass": True, "weight": 15}
    else:
        checks["has_packages"] = {"pass": False, "weight": 15}

    # mikrotik_config exists → +15
    router = await db.execute(select(MikrotikConfig).where(MikrotikConfig.tenant_id == tid))
    r = router.scalar_one_or_none()
    if r:
        score += 15
        checks["mikrotik_configured"] = {"pass": True, "weight": 15}
    else:
        checks["mikrotik_configured"] = {"pass": False, "weight": 15}

    # mikrotik reachable → +15
    if r and r.status == "ONLINE":
        score += 15
        checks["mikrotik_reachable"] = {"pass": True, "weight": 15}
    elif r:
        checks["mikrotik_reachable"] = {"pass": False, "weight": 15, "reason": f"Status: {r.status}"}
    else:
        checks["mikrotik_reachable"] = {"pass": False, "weight": 15, "reason": "Not configured"}

    # mpesa verified → +10
    mpesa = await db.execute(
        select(MpesaConfig).where(MpesaConfig.tenant_id == tid, MpesaConfig.is_active == True)
    )
    mc = mpesa.scalar_one_or_none()
    if mc and mc.is_verified:
        score += 10
        checks["mpesa_verified"] = {"pass": True, "weight": 10}
    elif mc:
        checks["mpesa_verified"] = {"pass": False, "weight": 10, "reason": "Not verified"}
    else:
        checks["mpesa_verified"] = {"pass": False, "weight": 10, "reason": "Not configured"}

    # sessions working → +10 (at least 1 successful transaction in last 7d)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    txn_ok = await db.execute(
        select(func.count(Transaction.id)).where(
            Transaction.tenant_id == tid,
            Transaction.status == TransactionStatus.SUCCESS,
            Transaction.created_at >= week_ago,
        )
    )
    has_recent_success = (txn_ok.scalar() or 0) > 0
    if has_recent_success:
        score += 10
        checks["sessions_working"] = {"pass": True, "weight": 10}
    else:
        checks["sessions_working"] = {"pass": False, "weight": 10}

    # network_events last 5 min OK → +5
    five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    net_ok = await db.execute(
        select(func.count(NetworkEvent.id)).where(
            NetworkEvent.tenant_id == tid,
            NetworkEvent.status == "up",
            NetworkEvent.checked_at >= five_min_ago,
        )
    )
    if (net_ok.scalar() or 0) > 0:
        score += 5
        checks["network_ok"] = {"pass": True, "weight": 5}
    else:
        # Check if any events exist at all
        any_net = await db.execute(
            select(func.count(NetworkEvent.id)).where(NetworkEvent.tenant_id == tid)
        )
        if (any_net.scalar() or 0) > 0:
            checks["network_ok"] = {"pass": False, "weight": 5, "reason": "Last event not UP"}
        else:
            checks["network_ok"] = {"pass": False, "weight": 5, "reason": "No data"}

    return {
        "tenant_id": tenant_id,
        "tenant_name": t.name,
        "score": score,
        "max_score": 100,
        "checks": checks,
    }


@router.get("/admin/isp/{tenant_id}/events")
async def isp_events(
    tenant_id: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Last N events for an ISP (audit_logs + network_events)."""
    try:
        tid = uuid.UUID(tenant_id)
    except ValueError:
        return {"error": "Invalid tenant ID"}

    events = []

    # Audit logs targeting this tenant
    audit = await db.execute(
        select(AuditLog)
        .where(AuditLog.target_id == tenant_id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    for a in audit.scalars().all():
        created = a.created_at
        if hasattr(created, 'tzinfo') and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        events.append({
            "type": "AUDIT",
            "action": a.action,
            "details": a.details,
            "actor": a.actor_email,
            "created_at": created.isoformat(),
        })

    # Network events
    net = await db.execute(
        select(NetworkEvent)
        .where(NetworkEvent.tenant_id == tid)
        .order_by(desc(NetworkEvent.checked_at))
        .limit(limit)
    )
    for n in net.scalars().all():
        events.append({
            "type": "NETWORK",
            "action": f"Network {n.status.upper()}",
            "details": {"latency_ms": n.latency_ms, "status": n.status},
            "actor": None,
            "created_at": _iso_dt(n.checked_at),
        })

    # Sort by created_at desc
    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events[:limit]


def _iso_dt(dt):
    if dt is None:
        return None
    if hasattr(dt, 'isoformat'):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.isoformat()
    return str(dt)


def _ensure_tz(dt):
    if dt is None:
        return datetime.now(timezone.utc)
    if hasattr(dt, 'tzinfo') and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
