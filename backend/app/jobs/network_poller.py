import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.mikrotik_config import MikrotikConfig
from app.services.network_checker import check_tenant_network
 
logger = logging.getLogger("honestbill.poller")
 
 
async def poll_all_tenants():
    """Poll network status for every active tenant. Runs every 60s."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant, MikrotikConfig)
            .join(MikrotikConfig, MikrotikConfig.tenant_id == Tenant.id)
            .where(Tenant.is_active == True)
        )
        rows = result.all()
 
        if not rows:
            logger.debug("No active tenants with MikroTik config to poll")
            return
 
        for tenant, mt_config in rows:
            slug = tenant.slug
            try:
                status = await check_tenant_network(tenant.id, mt_config.router_ip, db)
                logger.info(f"Polled {slug}: {status}")
            except Exception as e:
                logger.error(f"Poll failed for {slug}: {e}")