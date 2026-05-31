from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_platform_admin, require_isp_admin
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.package import Package  # CRITICAL: Added import
from app.models.transaction import Transaction, TransactionStatus
from app.models.session import Session, SessionStatus
from app.models.network_event import NetworkEvent
from app.services.network_checker import get_current_status

router = APIRouter()


class TenantCreate(BaseModel):
    slug: str
    name: str
    primary_color: str = "#00E676"
    support_phone: str | None = None
    commission_rate: float = 0.10


@router.get("/")
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    if current_user.tenant_id:
        result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    else:
        result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "slug": t.slug,
            "name": t.name,
            "is_active": t.is_active,
            "support_phone": t.support_phone,
            "commission_rate": float(t.commission_rate),
            "balance_ksh": float(t.balance_ksh),
            "created_at": t.created_at.isoformat(),
        }
        for t in tenants
    ]


@router.post("/")
async def create_tenant(
    data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_platform_admin),
):
    existing = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already taken")
    tenant = Tenant(
        slug=data.slug,
        name=data.name,
        primary_color=data.primary_color,
        support_phone=data.support_phone,
        commission_rate=data.commission_rate,
        is_active=True,
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return {"id": str(tenant.id), "slug": tenant.slug, "name": tenant.name}


@router.get("/tenants/dashboard")
async def isp_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    tenant_id = current_user.tenant_id
    rev_result = await db.execute(
        select(
            func.sum(Transaction.amount_ksh),
            func.sum(Transaction.isp_earnings_ksh),
            func.sum(Transaction.platform_fee_ksh),
            func.count(Transaction.id),
        ).where(
            Transaction.tenant_id == tenant_id,
            Transaction.status == TransactionStatus.SUCCESS.value,
        )
    )
    rev = rev_result.one()
    active_result = await db.execute(
        select(func.count(Session.id)).where(
            Session.tenant_id == tenant_id,
            Session.status == SessionStatus.ACTIVE.value,
        )
    )
    active_count = active_result.scalar() or 0
    net_status = await get_current_status(tenant_id)
    return {
        "revenue": {
            "gross_ksh": float(rev[0] or 0),
            "isp_earnings_ksh": float(rev[1] or 0),
            "platform_fee_ksh": float(rev[2] or 0),
            "transaction_count": rev[3] or 0,
        },
        "active_sessions": active_count,
        "network": net_status,
    }


class PortalConfigUpdateRequest(BaseModel):
    """Request payload for updating portal configuration from wizard"""
    template_id: str = None
    palette_index: int = None
    font_family: str = None
    card_radius: str = None
    layout_size: str = None
    name: str = None
    tagline: str = None
    location: str = None
    emoji: str = None
    support_phone: str = None
    show_status_banner: bool = None
    status_message: str = None
    enabled_features: dict = None


@router.post("/portal-config")
async def save_portal_config(
    data: PortalConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """
    Save ISP portal configuration. Called by onboarding wizard.
    
    Flow:
    1. Validate tenant ownership
    2. Build nested portal_config JSONB structure
    3. Save to tenant.portal_config
    4. Mark admin_user.onboarding_complete = True
    5. Return success with portal URL
    """
    
    # Validate: ISP admins must have a tenant
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=403, 
            detail="Platform admins don't have a portal to configure"
        )

    # Fetch tenant
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Build portal_config structure (nested JSONB)
    portal_config = {
        "version": "1.0",
        "template_id": data.template_id or "spotlight",
        "design": {
            "palette_index": data.palette_index if data.palette_index is not None else 0,
            "font_family": data.font_family or "Syne",
            "card_radius": data.card_radius or "16px",
            "layout_size": data.layout_size or "compact",
        },
        "brand": {
            "name": data.name or "",
            "tagline": data.tagline or "",
            "location": data.location or "",
            "emoji": data.emoji or "🌐",
            "support_phone": data.support_phone or "",
        },
        "network_awareness": {
            "show_status_banner": data.show_status_banner if data.show_status_banner is not None else True,
            "custom_status_message": data.status_message or "",
        },
        "enabled_features": data.enabled_features or {
            "mpesa_stk": True,
            "card_payments": False,
            "vouchers": False,
            "sms_receipts": False
        },
    }

    # CRITICAL: Save portal config and mark onboarding complete
    tenant.portal_config = portal_config
    current_user.onboarding_complete = True
    
    # Commit both changes atomically
    await db.commit()
    
    # Refresh tenant to get accurate state for response
    await db.refresh(tenant)

    return {
        "ok": True,
        "message": "Portal configuration saved successfully",
        "portal_url": f"/portal/{tenant.slug}",
        "onboarding_complete": True,
        "tenant_id": str(tenant.id),
    }


@router.patch("/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_platform_admin),
):
    result = await db.execute(select(Tenant).where(Tenant.id == uuid.UUID(tenant_id)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.is_active = data.get("is_active", tenant.is_active)
    await db.commit()
    return {"ok": True, "is_active": tenant.is_active}


@router.get("/{tenant_id}/network-status")
async def tenant_network_status(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    try:
        tid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    if current_user.tenant_id and current_user.tenant_id != tid:
        raise HTTPException(status_code=403, detail="Forbidden")
    status = await get_current_status(tid)
    return status


@router.get("/{tenant_id}/network-events")
async def tenant_network_events(
    tenant_id: str,
    limit: int = Query(30, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    try:
        tid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    if current_user.tenant_id and current_user.tenant_id != tid:
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await db.execute(
        select(NetworkEvent)
        .where(NetworkEvent.tenant_id == tid)
        .order_by(desc(NetworkEvent.checked_at))
        .limit(limit)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "status": e.status,
            "latency_ms": e.latency_ms,
            "note": getattr(e, "note", None),
            "checked_at": e.checked_at.isoformat() if e.checked_at else None,
            "created_at": e.checked_at.isoformat() if e.checked_at else None,
        }
        for e in events
    ]