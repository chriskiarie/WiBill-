"""
Subscriber management service for Monthly Subscribers module.
Handles: creation, IPAM, status lifecycle (pause/suspend/resume/activate),
billing cycle management, and MikroTik bridge synchronization.
"""
import uuid
import ipaddress
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy import update as sa_update

from app.models.subscriber import Subscriber
from app.models.subscriber_plan import SubscriberPlan, ClientType
from app.models.subscriber_status_log import SubscriberStatusLog
from app.models.subscriber_data_usage import SubscriberDataUsage
from app.models.ipam_pool import IpamPool
from app.models.tenant import Tenant
from app.services.mikrotik_service import (
    provision_subscriber,
    deprovision_subscriber,
    pause_subscriber_traffic,
    resume_subscriber_traffic,
    check_subscriber_online,
    get_subscriber_queue_stats,
    reconcile_subscribers_from_router,
    reconnect_subscriber,
    restart_subscriber,
)

logger = logging.getLogger("honestbill.subscribers")


# ============================================================================
# IPAM — IP Address Management
# ============================================================================

async def get_available_ips(
    tenant_id: uuid.UUID,
    pool_type: str = "wifi",
    db: AsyncSession = None,
) -> list[dict]:
    """Get all available (unused) IPs from the tenant's IPAM pools."""
    result = await db.execute(
        select(IpamPool).where(
            IpamPool.tenant_id == tenant_id,
            IpamPool.pool_type == pool_type,
            IpamPool.is_active == True,
        )
    )
    pools = result.scalars().all()
    if not pools:
        return []

    # Get all assigned IPs for this tenant
    assigned_result = await db.execute(
        select(Subscriber.networking_ip).where(
            Subscriber.tenant_id == tenant_id,
            Subscriber.status.in_(["active", "paused", "suspended", "overdue", "pending_suspension"]),
        )
    )
    assigned_ips = {row[0] for row in assigned_result.fetchall()}

    available = []
    for pool in pools:
        start = ipaddress.IPv4Address(pool.start_ip)
        end = ipaddress.IPv4Address(pool.end_ip)
        for ip_int in range(int(start), int(end) + 1):
            ip_str = str(ipaddress.IPv4Address(ip_int))
            if ip_str == pool.gateway:
                continue
            if ip_str not in assigned_ips:
                available.append({
                    "ip": ip_str,
                    "pool_id": str(pool.id),
                    "pool_name": pool.name,
                    "gateway": pool.gateway,
                    "subnet_cidr": pool.subnet_cidr,
                    "vlan_id": pool.vlan_id,
                    "interface_name": pool.interface_name,
                    "pool_type": pool.pool_type,
                })
    return available


async def allocate_ip(
    tenant_id: uuid.UUID,
    pool_type: str,
    db: AsyncSession,
) -> dict | None:
    """Allocate the first available IP from a pool."""
    available = await get_available_ips(tenant_id, pool_type, db)
    if not available:
        return None
    return available[0]


async def validate_ip_not_in_use(
    tenant_id: uuid.UUID,
    ip_address: str,
    exclude_subscriber_id: uuid.UUID | None = None,
    db: AsyncSession = None,
) -> bool:
    """Check if an IP is already assigned to an active subscriber."""
    query = select(Subscriber).where(
        Subscriber.tenant_id == tenant_id,
        Subscriber.networking_ip == ip_address,
        Subscriber.status.in_(["active", "paused", "suspended", "overdue", "pending_suspension"]),
    )
    if exclude_subscriber_id:
        query = query.where(Subscriber.id != exclude_subscriber_id)
    result = await db.execute(query)
    return result.scalar_one_or_none() is None


# ============================================================================
# ACCOUNT NUMBER GENERATION
# ============================================================================

async def generate_account_number(tenant_id: uuid.UUID, db: AsyncSession) -> str:
    """Generate a sequential account number per tenant: ACC-0001, ACC-0002, etc."""
    result = await db.execute(
        select(func.count(Subscriber.id)).where(Subscriber.tenant_id == tenant_id)
    )
    count = result.scalar() or 0
    return f"ACC-{count + 1:04d}"


# ============================================================================
# SUBSCRIBER CRUD
# ============================================================================

async def create_subscriber(
    tenant_id: uuid.UUID,
    plan_id: uuid.UUID | None,
    client_name: str,
    phone_number: str,
    networking_ip: str,
    networking_mac: str | None = None,
    networking_vlan: int | None = None,
    networking_interface: str | None = None,
    networking_gateway: str | None = None,
    id_number: str | None = None,
    email: str | None = None,
    installation_address: str | None = None,
    notes: str | None = None,
    billing_cycle_date: int = 1,
    billing_cycle_days: int = 30,
    data_cap_gb: float | None = None,
    db: AsyncSession = None,
) -> Subscriber:
    """Create a new monthly subscriber with IPAM validation."""
    # Validate IP is not in use
    ip_available = await validate_ip_not_in_use(tenant_id, networking_ip, db=db)
    if not ip_available:
        raise ValueError(f"IP address {networking_ip} is already assigned")

    # Generate account number
    account_number = await generate_account_number(tenant_id, db)

    # Calculate next billing date
    now = datetime.utcnow()
    next_billing = now.replace(day=min(billing_cycle_date, 28))
    if next_billing <= now:
        next_billing = (next_billing + timedelta(days=billing_cycle_days)).replace(
            day=min(billing_cycle_date, 28)
        )

    subscriber = Subscriber(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        plan_id=plan_id,
        account_number=account_number,
        client_name=client_name,
        phone_number=phone_number,
        id_number=id_number,
        email=email,
        installation_address=installation_address,
        notes=notes,
        networking_ip=networking_ip,
        networking_mac=networking_mac.upper() if networking_mac else None,
        networking_vlan=networking_vlan,
        networking_interface=networking_interface,
        networking_gateway=networking_gateway,
        billing_cycle_date=billing_cycle_date,
        billing_cycle_days=billing_cycle_days,
        next_billing_at=next_billing,
        data_cap_gb=data_cap_gb,
        status="active",
    )
    db.add(subscriber)

    # Log the creation
    log = SubscriberStatusLog(
        id=uuid.uuid4(),
        subscriber_id=subscriber.id,
        from_status=None,
        to_status="active",
        reason="New subscriber created",
        triggered_by="admin",
    )
    db.add(log)
    await db.commit()
    await db.refresh(subscriber)

    # Provision on MikroTik bridge (non-blocking from caller perspective)
    try:
        await provision_subscriber(
            tenant_id=str(tenant_id),
            subscriber_id=str(subscriber.id),
            ip_address=networking_ip,
            mac_address=networking_mac or "",
            plan_id=str(plan_id) if plan_id else None,
            db=db,
        )
    except Exception as e:
        logger.warning(f"Bridge provisioning deferred for {subscriber.account_number}: {e}")

    return subscriber


async def update_subscriber(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession,
    **kwargs,
) -> Subscriber:
    """Update subscriber fields with IPAM validation if IP changes."""
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.id == subscriber_id,
            Subscriber.tenant_id == tenant_id,
        )
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber:
        raise ValueError("Subscriber not found")

    # If IP is changing, validate it's not in use
    new_ip = kwargs.get("networking_ip")
    if new_ip and new_ip != subscriber.networking_ip:
        ip_ok = await validate_ip_not_in_use(tenant_id, new_ip, subscriber_id, db)
        if not ip_ok:
            raise ValueError(f"IP address {new_ip} is already assigned")

    for field, value in kwargs.items():
        if hasattr(subscriber, field):
            setattr(subscriber, field, value)

    subscriber.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(subscriber)
    return subscriber


async def get_subscriber(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> Subscriber | None:
    """Get a single subscriber by ID."""
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.id == subscriber_id,
            Subscriber.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def list_subscribers(
    tenant_id: uuid.UUID,
    status: str | None = None,
    client_type: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = None,
) -> tuple[list[Subscriber], int]:
    """List subscribers with optional filters."""
    query = select(Subscriber).where(Subscriber.tenant_id == tenant_id)

    if status:
        query = query.where(Subscriber.status == status)

    if client_type:
        query = query.join(SubscriberPlan, Subscriber.plan_id == SubscriberPlan.id, isouter=True)
        query = query.where(SubscriberPlan.client_type == client_type)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Subscriber.client_name.ilike(pattern),
                Subscriber.account_number.ilike(pattern),
                Subscriber.phone_number.ilike(pattern),
                Subscriber.networking_ip.ilike(pattern),
            )
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Subscriber.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    subscribers = result.scalars().all()

    return list(subscribers), total


# ============================================================================
# STATUS LIFECYCLE
# ============================================================================

async def _change_status(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    new_status: str,
    reason: str,
    triggered_by: str = "admin",
    db: AsyncSession = None,
) -> Subscriber:
    """Core status change with logging and MikroTik sync."""
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.id == subscriber_id,
            Subscriber.tenant_id == tenant_id,
        )
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber:
        raise ValueError("Subscriber not found")

    old_status = subscriber.status
    subscriber.status = new_status
    subscriber.updated_at = datetime.utcnow()

    log = SubscriberStatusLog(
        id=uuid.uuid4(),
        subscriber_id=subscriber.id,
        from_status=old_status,
        to_status=new_status,
        reason=reason,
        triggered_by=triggered_by,
    )
    db.add(log)
    await db.commit()
    await db.refresh(subscriber)
    return subscriber


async def pause_subscriber(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    reason: str = "User requested pause",
    db: AsyncSession = None,
) -> Subscriber:
    """Pause a subscriber (user-requested temporary stop)."""
    subscriber = await _change_status(subscriber_id, tenant_id, "paused", reason, "admin", db)
    try:
        await pause_subscriber_traffic(str(tenant_id), str(subscriber_id), subscriber.networking_ip, db)
    except Exception as e:
        logger.warning(f"Bridge pause failed for {subscriber.account_number}: {e}")
    return subscriber


async def suspend_subscriber(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    reason: str = "Payment overdue",
    db: AsyncSession = None,
) -> Subscriber:
    """Suspend a subscriber (system-enforced for non-payment)."""
    subscriber = await _change_status(subscriber_id, tenant_id, "suspended", reason, "system", db)
    try:
        await pause_subscriber_traffic(str(tenant_id), str(subscriber_id), subscriber.networking_ip, db)
    except Exception as e:
        logger.warning(f"Bridge suspend failed for {subscriber.account_number}: {e}")
    return subscriber


async def resume_subscriber(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    reason: str = "Payment received",
    db: AsyncSession = None,
) -> Subscriber:
    """Resume a paused or suspended subscriber."""
    subscriber = await _change_status(subscriber_id, tenant_id, "active", reason, "system", db)
    try:
        await resume_subscriber_traffic(str(tenant_id), str(subscriber_id), subscriber.networking_ip, db)
    except Exception as e:
        logger.warning(f"Bridge resume failed for {subscriber.account_number}: {e}")
    return subscriber


async def activate_subscriber(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession = None,
) -> Subscriber:
    """Activate a newly created subscriber on the MikroTik."""
    subscriber = await get_subscriber(subscriber_id, tenant_id, db)
    if not subscriber:
        raise ValueError("Subscriber not found")

    subscriber.status = "active"
    subscriber.updated_at = datetime.utcnow()

    log = SubscriberStatusLog(
        id=uuid.uuid4(),
        subscriber_id=subscriber.id,
        from_status="pending",
        to_status="active",
        reason="Subscriber activated",
        triggered_by="admin",
    )
    db.add(log)

    try:
        result = await provision_subscriber(
            tenant_id=str(tenant_id),
            subscriber_id=str(subscriber_id),
            ip_address=subscriber.networking_ip,
            mac_address=subscriber.networking_mac or "",
            plan_id=str(subscriber.plan_id) if subscriber.plan_id else None,
            db=db,
        )
        subscriber.last_sync_at = datetime.utcnow()
        subscriber.last_sync_status = "synced" if result.get("success") else "failed"
        subscriber.out_of_sync = not result.get("success", False)
    except Exception as e:
        subscriber.last_sync_status = f"error: {e}"
        subscriber.out_of_sync = True

    await db.commit()
    await db.refresh(subscriber)
    return subscriber


async def reconnect_subscriber_action(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession = None,
) -> Subscriber:
    """Reconnect a subscriber by removing and re-adding on the router."""
    subscriber = await get_subscriber(subscriber_id, tenant_id, db)
    if not subscriber:
        raise ValueError("Subscriber not found")

    try:
        result = await reconnect_subscriber(
            tenant_id=str(tenant_id),
            subscriber_id=str(subscriber_id),
            ip_address=subscriber.networking_ip,
            mac_address=subscriber.networking_mac or "",
            plan_id=str(subscriber.plan_id) if subscriber.plan_id else None,
            db=db,
        )
        subscriber.last_sync_at = datetime.utcnow()
        subscriber.last_sync_status = "reconnected" if result.get("success") else "reconnect_failed"
        subscriber.out_of_sync = not result.get("success", False)
        if not result.get("success"):
            raise ValueError(result.get("message", "Reconnect failed"))
    except Exception as e:
        subscriber.last_sync_status = f"error: {e}"
        subscriber.out_of_sync = True
        raise

    await db.commit()
    await db.refresh(subscriber)
    return subscriber


async def restart_subscriber_action(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession = None,
) -> Subscriber:
    """Restart a subscriber's connection on the router (reset queue)."""
    subscriber = await get_subscriber(subscriber_id, tenant_id, db)
    if not subscriber:
        raise ValueError("Subscriber not found")

    try:
        result = await restart_subscriber(
            tenant_id=str(tenant_id),
            subscriber_id=str(subscriber_id),
            ip_address=subscriber.networking_ip,
            db=db,
        )
        subscriber.last_sync_at = datetime.utcnow()
        subscriber.last_sync_status = "restarted" if result.get("success") else "restart_failed"
        subscriber.out_of_sync = not result.get("success", False)
        if not result.get("success"):
            raise ValueError(result.get("message", "Restart failed"))
    except Exception as e:
        subscriber.last_sync_status = f"error: {e}"
        subscriber.out_of_sync = True
        raise

    await db.commit()
    await db.refresh(subscriber)
    return subscriber


# ============================================================================
# DATA USAGE
# ============================================================================

async def record_data_usage(
    subscriber_id: uuid.UUID,
    usage_gb: float,
    interface_name: str | None = None,
    rx_bytes: int | None = None,
    tx_bytes: int | None = None,
    db: AsyncSession = None,
) -> SubscriberDataUsage:
    """Record a data usage snapshot."""
    record = SubscriberDataUsage(
        id=uuid.uuid4(),
        subscriber_id=subscriber_id,
        usage_gb=usage_gb,
        interface_name=interface_name,
        rx_bytes=rx_bytes,
        tx_bytes=tx_bytes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def update_subscriber_usage(
    subscriber_id: uuid.UUID,
    tenant_id: uuid.UUID,
    usage_gb: float,
    db: AsyncSession = None,
) -> Subscriber:
    """Update subscriber's data usage counters."""
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.id == subscriber_id,
            Subscriber.tenant_id == tenant_id,
        )
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber:
        raise ValueError("Subscriber not found")

    subscriber.data_used_today_gb += usage_gb
    subscriber.data_used_month_gb += usage_gb
    subscriber.data_used_total_gb += usage_gb
    subscriber.last_seen_at = datetime.utcnow()
    subscriber.online_status = "online"
    await db.commit()
    await db.refresh(subscriber)
    return subscriber


# ============================================================================
# BILLING
# ============================================================================

async def get_overdue_subscribers(tenant_id: uuid.UUID | None = None, db: AsyncSession = None) -> list[Subscriber]:
    """Find subscribers past their billing date with active status."""
    now = datetime.utcnow()
    query = select(Subscriber).where(
        Subscriber.status.in_(["active", "overdue"]),
        Subscriber.next_billing_at <= now,
    )
    if tenant_id:
        query = query.where(Subscriber.tenant_id == tenant_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_subscribers_due_today(db: AsyncSession = None) -> list[Subscriber]:
    """Find subscribers whose billing cycle date is today."""
    now = datetime.utcnow()
    query = select(Subscriber).where(
        Subscriber.status == "active",
        Subscriber.next_billing_at <= now + timedelta(days=1),
        Subscriber.next_billing_at > now - timedelta(days=1),
    )
    result = await db.execute(query)
    return list(result.scalars().all())


# ============================================================================
# RECONCILIATION
# ============================================================================

async def reconcile_with_router(tenant_id: uuid.UUID, db: AsyncSession) -> dict:
    """Compare DB subscribers with MikroTik router state and flag discrepancies."""
    router_subscribers = await reconcile_subscribers_from_router(str(tenant_id), db)
    if not router_subscribers:
        return {"success": False, "message": "Bridge unreachable", "discrepancies": []}

    router_ips = {s.get("address", s.get("ip")) for s in router_subscribers}

    result = await db.execute(
        select(Subscriber).where(
            Subscriber.tenant_id == tenant_id,
            Subscriber.status.in_(["active", "paused", "suspended"]),
        )
    )
    db_subscribers = result.scalars().all()
    db_ips = {s.networking_ip for s in db_subscribers}

    # Find discrepancies
    missing_from_router = db_ips - router_ips
    unknown_on_router = router_ips - db_ips

    discrepancies = []
    for ip in missing_from_router:
        sub = next((s for s in db_subscribers if s.networking_ip == ip), None)
        if sub:
            sub.out_of_sync = True
            sub.out_of_sync_note = "Missing from router config"
            discrepancies.append({
                "ip": ip,
                "account": sub.account_number,
                "type": "missing_from_router",
            })

    for ip in unknown_on_router:
        discrepancies.append({
            "ip": ip,
            "type": "unknown_on_router",
            "detail": "Exists on router but not in DB",
        })

    await db.commit()
    return {
        "success": True,
        "db_count": len(db_subscribers),
        "router_count": len(router_subscribers),
        "discrepancies": discrepancies,
    }
