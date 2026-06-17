"""
Feature Flags management for platform admin.
"""
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.feature_flag import FeatureFlag, FEATURES
from app.api.routes.auth import get_current_user, require_platform_admin, require_isp_admin

router = APIRouter(tags=["admin-feature-flags"])

class FlagSchema(BaseModel):
    feature_key: str
    is_enabled: bool

class TenantFlagsResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_slug: str
    is_active: bool
    status: str
    tier: str
    monthly_fee_ksh: Optional[float] = None
    flags: dict[str, bool]

async def ensure_flags_for_tenant(tenant_id: uuid.UUID, db: AsyncSession):
    """Ensure all default features exist for a tenant."""
    for key in FEATURES:
        stmt = select(FeatureFlag).where(
            FeatureFlag.tenant_id == tenant_id,
            FeatureFlag.feature_key == key
        )
        result = await db.execute(stmt)
        if not result.scalar_one_or_none():
            db.add(FeatureFlag(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                feature_key=key,
                is_enabled=False
            ))
    await db.commit()

@router.get("/admin/feature-flags")
async def list_feature_flags(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tenants_result = await db.execute(select(Tenant).order_by(Tenant.name))
    tenants = tenants_result.scalars().all()

    for t in tenants:
        await ensure_flags_for_tenant(t.id, db)

    stmt = select(FeatureFlag).order_by(FeatureFlag.tenant_id, FeatureFlag.feature_key)
    result = await db.execute(stmt)
    all_flags = result.scalars().all()

    tenant_map: dict[str, list[FeatureFlag]] = {}
    for f in all_flags:
        tid = str(f.tenant_id)
        if tid not in tenant_map:
            tenant_map[tid] = []
        tenant_map[tid].append(f)

    response = []
    for t in tenants:
        tid = str(t.id)
        flags_dict = {f.feature_key: f.is_enabled for f in tenant_map.get(tid, [])}
        for key in FEATURES:
            if key not in flags_dict:
                flags_dict[key] = False
        tier = "premium" if flags_dict.get('campaigns') or flags_dict.get('loyalty') else "free"
        response.append(TenantFlagsResponse(
            tenant_id=tid,
            tenant_name=t.name,
            tenant_slug=t.slug,
            is_active=t.is_active,
            status=t.status,
            tier=tier,
            monthly_fee_ksh=None,
            flags=flags_dict
        ))
    return response

@router.patch("/admin/feature-flags/{tenant_id}")
async def update_feature_flags(
    tenant_id: str,
    flags: List[FlagSchema],
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tid = uuid.UUID(tenant_id)
    stmt = select(Tenant).where(Tenant.id == tid)
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tenant not found")

    for flag in flags:
        stmt = select(FeatureFlag).where(
            FeatureFlag.tenant_id == tid,
            FeatureFlag.feature_key == flag.feature_key
        )
        result = await db.execute(stmt)
        f = result.scalar_one_or_none()
        if f:
            f.is_enabled = flag.is_enabled
        else:
            db.add(FeatureFlag(
                id=uuid.uuid4(),
                tenant_id=tid,
                feature_key=flag.feature_key,
                is_enabled=flag.is_enabled
            ))
    await db.commit()
    return {"status": "ok"}

@router.patch("/admin/feature-flags/{tenant_id}/tier")
async def update_tier(
    tenant_id: str,
    body: dict,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    tid = uuid.UUID(tenant_id)
    stmt = select(Tenant).where(Tenant.id == tid)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tier = body.get("tier", "free")
    premium_keys = ['campaigns', 'loyalty']
    for key in premium_keys:
        f_stmt = select(FeatureFlag).where(
            FeatureFlag.tenant_id == tid,
            FeatureFlag.feature_key == key
        )
        f_result = await db.execute(f_stmt)
        flag = f_result.scalar_one_or_none()
        if tier == "premium":
            if not flag:
                db.add(FeatureFlag(id=uuid.uuid4(), tenant_id=tid, feature_key=key, is_enabled=True))
        else:
            if flag:
                flag.is_enabled = False
    await db.commit()
    return {"status": "ok", "tier": tier}


@router.get("/tenants/feature-flags")
async def get_my_feature_flags(
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get feature flags for the current ISP admin's tenant."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with this user")
    stmt = select(FeatureFlag).where(FeatureFlag.tenant_id == current_user.tenant_id)
    result = await db.execute(stmt)
    flags = result.scalars().all()
    return {f.feature_key: f.is_enabled for f in flags}
