"""
Feature Flags management for platform admin.
Reads/writes feature flags directly on the Tenant model columns.
"""
from typing import Optional
import uuid
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.api.routes.auth import get_current_user, require_platform_admin, require_isp_admin

router = APIRouter(tags=["admin-feature-flags"])
logger = logging.getLogger("honestbill.admin.feature_flags")

async def _log_flag_action(db, actor, action, tenant_id, details=None):
    try:
        from app.core.database import engine
        from sqlalchemy import text as sa_text
        async with engine.begin() as conn:
            await conn.execute(sa_text(
                "INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type, target_id, details, created_at) "
                "VALUES (:id, :actor_id, :actor_email, :action, :target_type, :target_id, :details, :created_at)"
            ), {
                "id": uuid.uuid4(),
                "actor_id": str(actor.id),
                "actor_email": actor.email,
                "action": action,
                "target_type": "tenant",
                "target_id": str(tenant_id),
                "details": json.dumps(details) if details else None,
                "created_at": datetime.utcnow(),
            })
    except Exception as e:
        logger.warning(f"audit_log skipped ({action}): {e}")


TENANT_FEATURE_COLS = [
    "has_vouchers", "has_campaigns", "has_loyalty",
    "has_mikrotik", "has_portal_customization",
    "has_monthly_subscribers", "has_tv_subscribers",
]

FEATURE_LABEL_MAP = {
    "has_vouchers": "vouchers",
    "has_campaigns": "campaigns",
    "has_loyalty": "loyalty",
    "has_mikrotik": "mikrotik",
    "has_portal_customization": "portal_customization",
    "has_monthly_subscribers": "monthly_subscribers",
    "has_tv_subscribers": "tv_subscribers",
}

class TenantFlagsResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_slug: str
    is_active: bool
    status: str
    tier: str
    monthly_fee_ksh: Optional[float] = None
    flags: dict[str, bool]


@router.get("/admin/feature-flags")
async def list_feature_flags(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tenants_result = await db.execute(select(Tenant).order_by(Tenant.name))
    tenants = tenants_result.scalars().all()

    response = []
    for t in tenants:
        flags_dict = {}
        for col in TENANT_FEATURE_COLS:
            flags_dict[FEATURE_LABEL_MAP[col]] = getattr(t, col, False)
        tier = "premium" if t.is_premium else "free"
        response.append(TenantFlagsResponse(
            tenant_id=str(t.id),
            tenant_name=t.name,
            tenant_slug=t.slug,
            is_active=t.is_active,
            status=t.status,
            tier=tier,
            monthly_fee_ksh=float(t.monthly_fee_ksh) if t.monthly_fee_ksh else None,
            flags=flags_dict,
        ))
    return response


@router.patch("/admin/feature-flags/{tenant_id}")
async def update_feature_flags(
    tenant_id: str,
    body: dict,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tid = uuid.UUID(tenant_id)
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for col in TENANT_FEATURE_COLS:
        label = FEATURE_LABEL_MAP[col]
        if label in body:
            setattr(tenant, col, bool(body[label]))

    await db.commit()
    await _log_flag_action(db, current_user, 'update_feature_flags', tenant_id, {"flags": {k: body.get(k) for k in body if k in [FEATURE_LABEL_MAP[c] for c in TENANT_FEATURE_COLS]}})
    return {"ok": True}


@router.patch("/admin/feature-flags/{tenant_id}/tier")
async def update_tier(
    tenant_id: str,
    body: dict,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tid = uuid.UUID(tenant_id)
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_premium = body.get("tier") == "premium"
    tenant.is_premium = new_premium
    if new_premium:
        tenant.has_campaigns = True
        tenant.has_loyalty = True
    else:
        tenant.has_campaigns = False
        tenant.has_loyalty = False

    await db.commit()
    await _log_flag_action(db, current_user, 'update_tier', tenant_id, {"tier": "premium" if new_premium else "free", "campaigns": tenant.has_campaigns, "loyalty": tenant.has_loyalty})
    return {"ok": True, "tier": "premium" if new_premium else "free"}

