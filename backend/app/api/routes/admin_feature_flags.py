"""
Feature Flags management for platform admin.
"""
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.feature_flag import FeatureFlag, FEATURES
from app.api.routes.auth import get_current_user, require_platform_admin

router = APIRouter(tags=["admin-feature-flags"])

class FlagSchema(BaseModel):
    feature_key: str
    is_enabled: bool

class TenantFlagsResponse(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_slug: str
    flags: dict[str, bool]

    class Config:
        from_attributes = True

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
        response.append(TenantFlagsResponse(
            tenant_id=tid,
            tenant_name=t.name,
            tenant_slug=t.slug,
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
