"""
System health check endpoint
Returns network status, latency, and system metrics for ISP
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser

router = APIRouter()


@router.get("/health")
async def system_health(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """
    Get system health for the ISP
    
    Returns:
    - status: 'up', 'down', 'degraded'
    - latency_ms: Network latency
    - timestamp: When checked
    - mikrotik_online: Is MikroTik connected
    - active_users: Number of active sessions
    - upload_speed: Upload speed (Mbps)
    - download_speed: Download speed (Mbps)
    """
    # TODO: In production, check actual MikroTik and network status
    # For now, return healthy status
    
    return {
        "status": "up",
        "latency_ms": 14,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mikrotik_online": True,
        "active_users": 0,
        "upload_speed": 0.0,
        "download_speed": 0.0,
    }