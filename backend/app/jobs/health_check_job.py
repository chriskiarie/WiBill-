"""
Background health-check job for MikroTik routers (poll-based).

The bridge-PC health model is gone: router liveness is now derived from time
since the router's last poll (see router_status() in router_poll_service).
This job reconciles RouterHealthCheck records and auto-detected OutageEvents
from last_poll_at instead of calling the bridge/API. A router that stops
polling is a router whose customers have no internet — that is exactly the
kind of honest, automatic outage signal the platform depends on.

This job is NOT in the APScheduler rotation anymore (the poll itself IS the
health check); it is still available via /internal/health-check/run for
manual/cron reconciliation.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.mikrotik_config import MikrotikConfig
from app.models.router_health_check import RouterHealthCheck
from app.models.outage_event import OutageEvent
from app.services.router_poll_service import router_status

logger = logging.getLogger("health_check")

DEBOUNCE_THRESHOLD = 3  # consecutive offline polls before auto-creating outage
RESOLVE_THRESHOLD = 3   # consecutive online polls before auto-resolving outage


async def run_health_checks(db: AsyncSession):
    """Main entry point. Called by /internal/health-check/run only."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.status != "DISCONNECTED")
    )
    routers = result.scalars().all()

    if not routers:
        logger.info("No active routers to check")
        return

    now = datetime.now(timezone.utc)
    for router in routers:
        try:
            await _check_router(db, router, now)
        except Exception as e:
            logger.error(f"Health check failed for router {router.id}: {e}")

    await db.commit()


async def _check_router(db: AsyncSession, router: MikrotikConfig, now: datetime):
    """Reconcile one router's poll-based health + auto-outage state."""
    online = router_status(router) == "online"

    check = RouterHealthCheck(
        router_id=router.id,
        checked_at=now,
        management_reachable=online,
        wan_reachable=online,  # a successful poll proves the internet path works
    )
    db.add(check)

    await _evaluate_outage_status(db, router, online, now)


async def _evaluate_outage_status(
    db: AsyncSession,
    router: MikrotikConfig,
    online: bool,
    now: datetime,
):
    """Debounce poll status before auto-creating/resolving outages."""
    result = await db.execute(
        select(RouterHealthCheck)
        .where(RouterHealthCheck.router_id == router.id)
        .order_by(RouterHealthCheck.checked_at.desc())
        .limit(DEBOUNCE_THRESHOLD)
    )
    recent = result.scalars().all()

    if len(recent) < DEBOUNCE_THRESHOLD:
        return  # not enough data yet

    offline_streak = sum(1 for c in recent if not c.management_reachable)
    online_streak = sum(1 for c in recent if c.management_reachable)

    if offline_streak >= DEBOUNCE_THRESHOLD and not online:
        await _auto_create_outage(db, router, now)
    elif online_streak >= RESOLVE_THRESHOLD and online:
        await _auto_resolve_outage(db, router, now)


async def _auto_create_outage(db: AsyncSession, router: MikrotikConfig, now: datetime):
    existing = await db.execute(
        select(OutageEvent).where(
            OutageEvent.tenant_id == router.tenant_id,
            OutageEvent.router_id == router.id,
            OutageEvent.source == "auto",
            OutageEvent.resolved_at.is_(None),
        )
    )
    if existing.scalar_one_or_none():
        return  # already have an active auto outage

    outage = OutageEvent(
        tenant_id=router.tenant_id,
        router_id=router.id,
        source="auto",
        status="confirmed_down",
        started_at=now,
        description="Automated detection: router stopped polling (offline > 90s)",
    )
    db.add(outage)
    logger.info(f"Auto-created outage for router {router.id} ({router.router_ip})")


async def _auto_resolve_outage(db: AsyncSession, router: MikrotikConfig, now: datetime):
    result = await db.execute(
        select(OutageEvent).where(
            OutageEvent.tenant_id == router.tenant_id,
            OutageEvent.router_id == router.id,
            OutageEvent.source == "auto",
            OutageEvent.resolved_at.is_(None),
        )
    )
    for outage in result.scalars().all():
        outage.status = "resolved"
        outage.resolved_at = now
        logger.info(f"Auto-resolved outage {outage.id} for router {router.id}")
