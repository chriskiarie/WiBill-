"""
System health check endpoint
Returns network status, latency, and system metrics for ISP
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.session import Session
from app.models.network_event import NetworkEvent
from app.services.mikrotik_service import check_mikrotik_connection

router = APIRouter()


@router.get("/health")
async def system_health(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """
    Get real system health for the ISP.
    """
    tenant_id = getattr(current_user, "tenant_id", None)
    tenant_id_str = str(tenant_id) if tenant_id else None

    # Check active sessions
    active_users = 0
    if tenant_id_str:
        result = await db.execute(
            select(func.count()).select_from(Session).where(
                Session.tenant_id == tenant_id, Session.status == "active"
            )
        )
        active_users = result.scalar() or 0

    # Check latest network event
    latency_ms = None
    network_status = "unknown"
    if tenant_id_str:
        result = await db.execute(
            select(NetworkEvent).where(NetworkEvent.tenant_id == tenant_id)
            .order_by(NetworkEvent.checked_at.desc()).limit(1)
        )
        event = result.scalar_one_or_none()
        if event:
            latency_ms = event.latency_ms
            network_status = event.status

    # Check MikroTik connectivity
    mikrotik_online = False
    if tenant_id_str:
        try:
            mk_result = await check_mikrotik_connection(tenant_id_str, db)
            mikrotik_online = mk_result.get("success", False)
        except Exception:
            mikrotik_online = False

    status = "up"
    if network_status == "down":
        status = "down"
    elif network_status == "degraded" or (latency_ms and latency_ms > 200):
        status = "degraded"

    return {
        "status": status,
        "latency_ms": latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mikrotik_online": mikrotik_online,
        "active_users": active_users,
        "network_status": network_status,
    }