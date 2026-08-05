"""
Background health-check job for MikroTik routers.

Runs every 60-120s via Railway cron or APScheduler.
Checks management reachability and WAN reachability for each active router.
Uses 3-consecutive-check debounce before creating/resolving outage events.

NOTE: Auto-detection depends on the MikroTik service being real (not a mock stub).
Until then, this job will silently skip routers that can't be reached.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.mikrotik_config import MikrotikConfig
from app.models.router_health_check import RouterHealthCheck
from app.models.outage_event import OutageEvent

logger = logging.getLogger("health_check")

DEBOUNCE_THRESHOLD = 3  # consecutive failures before auto-creating outage
RESOLVE_THRESHOLD = 3   # consecutive successes before auto-resolving outage


async def run_health_checks(db: AsyncSession):
    """Main entry point. Called by cron endpoint or APScheduler."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.status != "DISCONNECTED")
    )
    routers = result.scalars().all()

    if not routers:
        logger.info("No active routers to check")
        return

    for router in routers:
        try:
            await _check_router(db, router)
        except Exception as e:
            logger.error(f"Health check failed for router {router.id}: {e}")

    await db.commit()


async def _check_router(db: AsyncSession, router: MikrotikConfig):
    """Check a single router's health and update outage events."""
    now = datetime.now(timezone.utc)

    # Step 1: Check management reachability
    management_reachable = await _check_management_reachable(router)

    # Step 2: If management reachable, check WAN
    wan_reachable = None
    if management_reachable:
        wan_reachable = await _check_wan_reachable(router)

    # Step 3: Write health check record
    check = RouterHealthCheck(
        router_id=router.id,
        checked_at=now,
        management_reachable=management_reachable,
        wan_reachable=wan_reachable,
    )
    db.add(check)

    # Step 4: Debounce logic — check last N records
    await _evaluate_outage_status(db, router, now)


async def _check_management_reachable(router: MikrotikConfig) -> bool:
    """Check if the router's management interface is reachable.
    Returns True if the bridge/API is responding.
    """
    try:
        from app.services.mikrotik_service import check_mikrotik_connection
        result = await check_mikrotik_connection(
            router_ip=router.router_ip,
            api_port=router.api_port,
            api_username=router.api_username,
            api_password_enc=router.api_password_enc,
            tunnel_hostname=router.tunnel_hostname,
        )
        return result.get("connected", False)
    except Exception as e:
        logger.warning(f"Management check failed for {router.router_ip}: {e}")
        return False


async def _check_wan_reachable(router: MikrotikConfig) -> bool:
    """Check if the router's WAN uplink is reachable.
    Returns True if the router can reach the internet.
    """
    try:
        from app.services.mikrotik_service import check_mikrotik_connection
        # For now, use the same connection check — real WAN check would
        # use RouterOS API to ping an external IP
        result = await check_mikrotik_connection(
            router_ip=router.router_ip,
            api_port=router.api_port,
            api_username=router.api_username,
            api_password_enc=router.api_password_enc,
            tunnel_hostname=router.tunnel_hostname,
        )
        return result.get("connected", False)
    except Exception:
        return False


async def _evaluate_outage_status(db: AsyncSession, router: MikrotikConfig, now: datetime):
    """Evaluate whether to create or resolve an outage based on recent health checks."""
    # Get last N health checks for this router
    result = await db.execute(
        select(RouterHealthCheck)
        .where(RouterHealthCheck.router_id == router.id)
        .order_by(RouterHealthCheck.checked_at.desc())
        .limit(DEBOUNCE_THRESHOLD)
    )
    recent_checks = result.scalars().all()

    if len(recent_checks) < DEBOUNCE_THRESHOLD:
        return  # Not enough data yet

    # Check for consecutive WAN failures (management unreachable = skip, don't auto-create)
    wan_failures = 0
    wan_successes = 0
    management_failures = 0

    for check in recent_checks:
        if not check.management_reachable:
            management_failures += 1
            continue  # Can't test WAN if management is down

        if check.wan_reachable is False:
            wan_failures += 1
            wan_successes = 0  # Reset successes on failure
        elif check.wan_reachable is True:
            wan_successes += 1
            wan_failures = 0  # Reset failures on success

    # Management down = internal issue, don't auto-create customer-facing outage
    if management_failures == DEBOUNCE_THRESHOLD:
        logger.warning(f"Router {router.id} management unreachable (internal issue, not customer outage)")
        return

    # WAN down for N consecutive checks = auto-create outage
    if wan_failures >= DEBOUNCE_THRESHOLD:
        await _auto_create_outage(db, router, now)

    # WAN up for N consecutive checks = auto-resolve outage
    elif wan_successes >= RESOLVE_THRESHOLD:
        await _auto_resolve_outage(db, router, now)


async def _auto_create_outage(db: AsyncSession, router: MikrotikConfig, now: datetime):
    """Auto-create an outage event if none exists."""
    # Check if there's already an unresolved auto outage for this router
    existing = await db.execute(
        select(OutageEvent).where(
            OutageEvent.tenant_id == router.tenant_id,
            OutageEvent.router_id == router.id,
            OutageEvent.source == "auto",
            OutageEvent.resolved_at.is_(None),
        )
    )
    if existing.scalar_one_or_none():
        return  # Already have an active auto outage

    outage = OutageEvent(
        tenant_id=router.tenant_id,
        router_id=router.id,
        source="auto",
        status="confirmed_down",
        started_at=now,
        description="Automated detection: WAN uplink unreachable",
    )
    db.add(outage)
    logger.info(f"Auto-created outage for router {router.id} ({router.router_ip})")


async def _auto_resolve_outage(db: AsyncSession, router: MikrotikConfig, now: datetime):
    """Auto-resolve existing auto-detected outages."""
    result = await db.execute(
        select(OutageEvent).where(
            OutageEvent.tenant_id == router.tenant_id,
            OutageEvent.router_id == router.id,
            OutageEvent.source == "auto",
            OutageEvent.resolved_at.is_(None),
        )
    )
    outages = result.scalars().all()
    for outage in outages:
        outage.status = "resolved"
        outage.resolved_at = now
        logger.info(f"Auto-resolved outage {outage.id} for router {router.id}")
