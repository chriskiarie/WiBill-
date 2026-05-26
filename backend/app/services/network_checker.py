import logging
from datetime import datetime, timezone
from icmplib import ping, SocketPermissionError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.network_event import NetworkEvent, NetworkStatus
from app.models.mikrotik_config import MikrotikConfig

logger = logging.getLogger("honestbill.network")

# Consecutive failures before marking as DOWN
OUTAGE_THRESHOLD = 3


async def check_tenant_network(tenant_id, router_ip: str, db: AsyncSession) -> NetworkStatus:
    """
    Ping the router IP. Record result. Return current status.
    """
    try:
        result = ping(router_ip, count=3, timeout=2, privileged=False)
        is_alive = result.is_alive
        latency = int(result.avg_rtt) if is_alive else None
    except SocketPermissionError:
        # On Windows, unprivileged ICMP may fail — fall back to TCP check
        import socket
        try:
            sock = socket.create_connection((router_ip, 8728), timeout=3)
            sock.close()
            is_alive = True
            latency = None
        except (socket.timeout, ConnectionRefusedError, OSError):
            is_alive = False
            latency = None
    except Exception as e:
        logger.warning(f"Ping error for tenant {tenant_id} ({router_ip}): {e}")
        is_alive = False
        latency = None

    # Check recent failures to determine if truly DOWN
    if not is_alive:
        recent = await db.execute(
            select(NetworkEvent)
            .where(NetworkEvent.tenant_id == tenant_id)
            .order_by(desc(NetworkEvent.checked_at))
            .limit(OUTAGE_THRESHOLD - 1)
        )
        recent_events = recent.scalars().all()
        all_down = all(e.status == NetworkStatus.DOWN for e in recent_events)
        status = NetworkStatus.DOWN if (len(recent_events) >= OUTAGE_THRESHOLD - 1 and all_down) else NetworkStatus.DEGRADED
    else:
        status = NetworkStatus.UP

    # Find active outage
    outage_start = None
    if status in (NetworkStatus.DOWN, NetworkStatus.DEGRADED):
        last_up = await db.execute(
            select(NetworkEvent)
            .where(
                NetworkEvent.tenant_id == tenant_id,
                NetworkEvent.status == NetworkStatus.UP,
            )
            .order_by(desc(NetworkEvent.checked_at))
            .limit(1)
        )
        last_up_event = last_up.scalar_one_or_none()
        outage_start = last_up_event.checked_at if last_up_event else datetime.now(timezone.utc)

    event = NetworkEvent(
        tenant_id=tenant_id,
        status=status,
        latency_ms=latency,
        checked_at=datetime.now(timezone.utc),
        outage_start=outage_start,
        outage_end=None,
    )
    db.add(event)
    await db.commit()

    logger.info(f"Tenant {tenant_id} | {router_ip} | {status.value} | latency={latency}ms")
    return status


async def get_current_status(tenant_id) -> dict:
    """
    Get the latest network status for a tenant.
    Returns dict with status, latency, and outage duration if down.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(NetworkEvent)
            .where(NetworkEvent.tenant_id == tenant_id)
            .order_by(desc(NetworkEvent.checked_at))
            .limit(1)
        )
        event = result.scalar_one_or_none()

        if not event:
            return {"status": "unknown", "latency_ms": None, "outage_minutes": None}

        outage_minutes = None
        if event.status != NetworkStatus.UP and event.outage_start:
            delta = datetime.now(timezone.utc) - event.outage_start.replace(tzinfo=timezone.utc)
            outage_minutes = int(delta.total_seconds() / 60)

        return {
            "status": event.status.value,
            "latency_ms": event.latency_ms,
            "outage_minutes": outage_minutes,
            "checked_at": event.checked_at.isoformat(),
        }