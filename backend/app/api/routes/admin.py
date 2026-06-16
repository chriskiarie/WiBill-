"""
app/api/routes/admin.py - Admin/Platform-only routes for ISP management
"""

from datetime import datetime, timedelta, timezone
from typing import List
import uuid
import secrets
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
# Pull from the individual model files to ensure zero barrel-import bugs
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.isp_invite import ISPInvite, InviteStatus
from app.models.audit_log import AuditLog
from app.api.routes.auth import get_current_user, require_platform_admin


class CommissionUpdate(BaseModel):
    commission_rate: float


log = logging.getLogger("honestbill.admin")


async def log_action(db, actor: AdminUser, action: str, target_type: str | None = None, target_id: str | None = None, details: dict | None = None):
    """Log admin action using a separate connection so failures never corrupt the main transaction."""
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
                "target_type": target_type,
                "target_id": target_id,
                "details": json.dumps(details) if details else None,
                "created_at": datetime.utcnow(),
            })
    except Exception as e:
        log.warning(f"audit_log skipped ({action}): {e}")

# ── INLINE SCHEMAS (Fixes No module named 'app.schemas') ─────────────────────
class ISPInviteResponse(BaseModel):
    id: str
    token: str
    invite_link: str
    expires_at: datetime
    created_at: datetime
    status: str

    class Config:
        from_attributes = True


class ISPInviteGenerateRequest(BaseModel):
    isp_name: str | None = None
    expires_in_days: int = 7


class TenantResponse(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    is_active: bool
    commission_rate: float
    balance_ksh: float
    created_at: datetime

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    id: str
    slug: str
    name: str
    is_active: bool
    commission_rate: float
    balance_ksh: float
    created_at: str

router = APIRouter(tags=["admin"])


@router.post("/admin/invites/generate", response_model=ISPInviteResponse)
async def generate_invite(
    request: ISPInviteGenerateRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> ISPInviteResponse:
    """Generate a new ISP invite link (platform_admin only)."""
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_in_days or 7)
    created_at = datetime.now(timezone.utc)
    
    invite = ISPInvite(
        id=uuid.uuid4(),
        token=token,
        created_by=current_user.id,
        status=InviteStatus.PENDING,
        expires_at=expires_at,
        created_at=created_at
    )
    
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    
    invite_link = f"https://wi-bill.vercel.app/join?ref={token}"

    await log_action(db, current_user, 'generate_invite', 'isp_invite', str(invite.id), {'isp_name': request.isp_name})
    await db.commit()

    return ISPInviteResponse(
        id=str(invite.id),
        token=invite.token,
        invite_link=invite_link,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        status=invite.status.value
    )


@router.get("/admin/tenants", response_model=List[TenantListResponse])
async def list_tenants(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> List[TenantListResponse]:
    """List all tenants (platform_admin only)"""
    stmt = select(Tenant).order_by(Tenant.created_at.desc())
    result = await db.execute(stmt)
    tenants = result.scalars().all()
    
    return [
        TenantListResponse(
            id=str(t.id),
            slug=t.slug,
            name=t.name,
            is_active=t.is_active,
            commission_rate=float(t.commission_rate),
            balance_ksh=float(t.balance_ksh),
            created_at=t.created_at.isoformat() if t.created_at else ""
        )
        for t in tenants
    ]


@router.patch("/admin/tenants/{tenant_id}/reject", response_model=TenantResponse)
async def reject_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """Reject a tenant — locks it so it cannot be used, without deleting data."""
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = False
    tenant.is_locked = True
    tenant.locked_reason = "Rejected by admin"
    tenant.locked_at = datetime.utcnow()
    db.add(tenant)
    
    # Deactivate associated admin users
    from app.models.admin_user import AdminUser as AU
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(AU)
        .where(AU.tenant_id == tenant.id)
        .values(is_active=False)
    )
    
    await log_action(db, current_user, 'reject_tenant', 'tenant', tenant_id, {'name': tenant.name})
    await db.commit()
    await db.refresh(tenant)
    
    return TenantResponse(id=tenant.id, slug=tenant.slug, name=tenant.name, is_active=tenant.is_active, commission_rate=float(tenant.commission_rate), balance_ksh=float(tenant.balance_ksh), created_at=tenant.created_at)


@router.patch("/admin/tenants/{tenant_id}/suspend", response_model=TenantResponse)
async def suspend_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """Suspend an ISP tenant (sets is_active=False)."""
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = False
    db.add(tenant)
    await log_action(db, current_user, 'suspend_tenant', 'tenant', tenant_id, {'name': tenant.name})
    await db.commit()
    await db.refresh(tenant)
    
    return TenantResponse(id=tenant.id, slug=tenant.slug, name=tenant.name, is_active=tenant.is_active, commission_rate=float(tenant.commission_rate), balance_ksh=float(tenant.balance_ksh), created_at=tenant.created_at)


@router.patch("/admin/tenants/{tenant_id}/unsuspend", response_model=TenantResponse)
async def unsuspend_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """Unsuspend (reactivate) an ISP tenant (sets is_active=True)."""
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = True
    db.add(tenant)
    await log_action(db, current_user, 'unsuspend_tenant', 'tenant', tenant_id, {'name': tenant.name})
    await db.commit()
    await db.refresh(tenant)
    
    # Also activate admin users
    from app.models.admin_user import AdminUser as AU
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(AU)
        .where(AU.tenant_id == tenant.id)
        .values(is_active=True)
    )
    await db.commit()
    
    return TenantResponse(id=tenant.id, slug=tenant.slug, name=tenant.name, is_active=tenant.is_active, commission_rate=float(tenant.commission_rate), balance_ksh=float(tenant.balance_ksh), created_at=tenant.created_at)


@router.get("/admin/invites", response_model=List[ISPInviteResponse])
async def list_invites(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> List[ISPInviteResponse]:
    """List all ISP invites (platform_admin only)"""
    stmt = select(ISPInvite).order_by(ISPInvite.created_at.desc())
    result = await db.execute(stmt)
    invites = result.scalars().all()
    
    return [
        ISPInviteResponse(
            id=str(i.id),
            token=i.token,
            invite_link=f"https://wi-bill.vercel.app/join?ref={i.token}",
            expires_at=i.expires_at,
            created_at=i.created_at,
            status=i.status.value
        )
        for i in invites
    ]


@router.patch("/admin/tenants/{tenant_id}/approve", response_model=TenantResponse)
async def approve_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """Approve a pending ISP tenant by updating its status to active."""
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = True
    if hasattr(tenant, 'pending_approval'):
        tenant.pending_approval = False

    db.add(tenant)
    await log_action(db, current_user, 'approve_tenant', 'tenant', tenant_id, {'name': tenant.name})
    await db.commit()
    await db.refresh(tenant)

    return TenantResponse(id=tenant.id, slug=tenant.slug, name=tenant.name, is_active=tenant.is_active, commission_rate=float(tenant.commission_rate), balance_ksh=float(tenant.balance_ksh), created_at=tenant.created_at)


@router.get("/admin/partners/revenue")
async def partner_revenue(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Per-ISP revenue breakdown with commission info for the Partners page."""
    from app.models.transaction import Transaction
    from sqlalchemy import func

    stmt = (
        select(
            Tenant.id,
            Tenant.name,
            Tenant.slug,
            Tenant.is_active,
            Tenant.is_locked,
            Tenant.commission_rate,
            func.coalesce(func.sum(Transaction.amount_ksh), 0).label("total_revenue"),
            func.coalesce(func.sum(Transaction.platform_fee_ksh), 0).label("platform_earnings"),
            func.coalesce(func.sum(Transaction.isp_earnings_ksh), 0).label("isp_earnings"),
            func.count(Transaction.id).label("transaction_count"),
        )
        .outerjoin(
            Transaction,
            (Transaction.tenant_id == Tenant.id) & (Transaction.status == "success"),
        )
        .group_by(Tenant.id)
        .order_by(func.coalesce(func.sum(Transaction.platform_fee_ksh), 0).desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": str(r.id),
            "name": r.name,
            "slug": r.slug,
            "is_active": r.is_active,
            "is_locked": r.is_locked,
            "commission_rate": float(r.commission_rate),
            "total_revenue": float(r.total_revenue),
            "platform_earnings": float(r.platform_earnings),
            "isp_earnings": float(r.isp_earnings),
            "transaction_count": r.transaction_count,
        }
        for r in rows
    ]


@router.patch("/admin/tenants/{tenant_id}/commission")
async def update_tenant_commission(
    tenant_id: str,
    body: CommissionUpdate,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update an ISP's commission rate (platform_admin only)."""
    if body.commission_rate < 0 or body.commission_rate > 100:
        raise HTTPException(status_code=400, detail="commission_rate must be between 0 and 100")

    rate = body.commission_rate

    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.commission_rate = rate
    db.add(tenant)
    await log_action(db, current_user, 'update_commission', 'tenant', tenant_id, {'name': tenant.name, 'new_rate': rate})
    await db.commit()
    await db.refresh(tenant)

    return {"id": str(tenant.id), "commission_rate": float(tenant.commission_rate)}