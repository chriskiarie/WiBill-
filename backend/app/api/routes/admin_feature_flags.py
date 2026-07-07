"""
Feature Flags management for platform admin.
Reads/writes feature flags directly on the Tenant model columns.
"""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.api.routes.auth import get_current_user, require_platform_admin, require_isp_admin

router = APIRouter(tags=["admin-feature-flags"])

TENANT_FEATURE_COLS = [
    "has_vouchers", "has_campaigns", "has_loyalty",
    "has_mikrotik", "has_portal_customization",
]

FEATURE_LABEL_MAP = {
    "has_vouchers": "vouchers",
    "has_campaigns": "campaigns",
    "has_loyalty": "loyalty",
    "has_mikrotik": "mikrotik",
    "has_portal_customization": "portal_customization",
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
    return {"ok": True, "tier": "premium" if new_premium else "free"}

