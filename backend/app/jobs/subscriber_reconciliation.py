"""
Runs every 12 hours: pulls active config from MikroTik bridge and compares
with DB records. Flags discrepancies (manual router edits via WinBox).
"""
import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.subscriber import Subscriber
from app.services.subscriber_service import reconcile_with_router

logger = logging.getLogger("honestbill.reconciliation")


async def reconcile_all_tenants():
    """Run reconciliation for every active tenant with monthly subscribers."""
    logger.info("=== Subscriber reconciliation: starting ===")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant).where(
                Tenant.is_active == True,
                Tenant.has_monthly_subscribers == True,
            )
        )
        tenants = result.scalars().all()
        logger.info(f"Running reconciliation for {len(tenants)} tenant(s)")

        for tenant in tenants:
            try:
                result = await reconcile_with_router(tenant.id, db)
                if result.get("success"):
                    disc = result.get("discrepancies", [])
                    if disc:
                        logger.warning(
                            f"Tenant {tenant.slug}: {len(disc)} discrepancy(ies) found"
                        )
                        for d in disc[:10]:
                            logger.warning(f"  Discrepancy: {d}")
                    else:
                        logger.info(f"Tenant {tenant.slug}: all in sync")
                else:
                    logger.warning(f"Tenant {tenant.slug}: bridge unreachable — skipping")
            except Exception as e:
                logger.error(f"Reconciliation failed for tenant {tenant.slug}: {e}")

    logger.info("=== Subscriber reconciliation: complete ===")
