"""
Runs every 5-15 minutes: queries MikroTik bridge for queue/bandwidth stats
per subscriber and aggregates usage data.
"""
import logging
from datetime import datetime
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.subscriber import Subscriber
from app.services.mikrotik_service import get_subscriber_queue_stats
from app.services.subscriber_service import record_data_usage, update_subscriber_usage

logger = logging.getLogger("honestbill.usage_poller")

# Track last day to detect day rollover and reset daily counters
_last_poll_day = {}


async def poll_subscriber_usage():
    """Poll data usage for all active subscribers across all tenants."""
    global _last_poll_day
    logger.info("=== Usage poller: starting ===")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant).where(
                Tenant.is_active == True,
                Tenant.has_monthly_subscribers == True,
            )
        )
        tenants = result.scalars().all()

        for tenant in tenants:
            try:
                subs_result = await db.execute(
                    select(Subscriber).where(
                        Subscriber.tenant_id == tenant.id,
                        Subscriber.status.in_(["active", "overdue"]),
                    )
                )
                subscribers = subs_result.scalars().all()

                for subscriber in subscribers:
                    try:
                        stats = await get_subscriber_queue_stats(
                            tenant_id=str(tenant.id),
                            ip_address=subscriber.networking_ip,
                            db=db,
                        )
                        if not stats.get("success"):
                            continue

                        # Calculate usage from byte counters
                        bytes_in = int(stats.get("bytes_in", 0))
                        bytes_out = int(stats.get("bytes_out", 0))
                        total_bytes = bytes_in + bytes_out
                        usage_gb = total_bytes / (1024 ** 3)

                        if usage_gb <= 0:
                            continue

                        # Detect day rollover and reset daily counter
                        today = datetime.utcnow().day
                        tenant_key = str(tenant.id)
                        if _last_poll_day.get(tenant_key) != today:
                            for s in subscribers:
                                s.data_used_today_gb = 0.0
                            _last_poll_day[tenant_key] = today

                        # Record usage snapshot
                        await record_data_usage(
                            subscriber_id=subscriber.id,
                            usage_gb=usage_gb,
                            interface_name=stats.get("queue_name"),
                            rx_bytes=bytes_in,
                            tx_bytes=bytes_out,
                            db=db,
                        )

                        # Update subscriber counters
                        await update_subscriber_usage(
                            subscriber_id=subscriber.id,
                            tenant_id=tenant.id,
                            usage_gb=usage_gb,
                            db=db,
                        )

                    except Exception as e:
                        logger.warning(
                            f"Usage poll failed for {subscriber.account_number}: {e}"
                        )

            except Exception as e:
                logger.error(f"Usage poll failed for tenant {tenant.slug}: {e}")

    logger.info("=== Usage poller: complete ===")
