from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_platform_admin, require_isp_admin, get_current_user
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
    current_user: AdminUser = Depends(require_platform_admin),  # FIX: was require_isp_admin
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
    from datetime import datetime, timedelta
    tenant_id = current_user.tenant_id
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start - timedelta(days=30)

    # All-time totals
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

    # Today's split
    today_result = await db.execute(
        select(
            func.sum(Transaction.amount_ksh),
            func.sum(Transaction.platform_fee_ksh),
            func.sum(Transaction.isp_earnings_ksh),
            func.count(Transaction.id),
        ).where(
            Transaction.tenant_id == tenant_id,
            Transaction.status == TransactionStatus.SUCCESS.value,
            Transaction.created_at >= today_start,
        )
    )
    today = today_result.one()

    # Last 30 days split
    month_result = await db.execute(
        select(
            func.sum(Transaction.amount_ksh),
            func.sum(Transaction.platform_fee_ksh),
            func.sum(Transaction.isp_earnings_ksh),
            func.count(Transaction.id),
        ).where(
            Transaction.tenant_id == tenant_id,
            Transaction.status == TransactionStatus.SUCCESS.value,
            Transaction.created_at >= month_start,
        )
    )
    month = month_result.one()

    # Active sessions
    active_result = await db.execute(
        select(func.count(Session.id)).where(
            Session.tenant_id == tenant_id,
            Session.status == SessionStatus.ACTIVE.value,
        )
    )
    active_count = active_result.scalar() or 0

    # Failed / pending recent transactions
    recent_txns = await db.execute(
        select(Transaction)
        .where(Transaction.tenant_id == tenant_id)
        .order_by(desc(Transaction.created_at))
        .limit(5)
    )

    net_status = await get_current_status(tenant_id)
    return {
        "today": {
            "gross_ksh": float(today[0] or 0),
            "platform_fee_ksh": float(today[1] or 0),
            "isp_earnings_ksh": float(today[2] or 0),
            "count": today[3] or 0,
        },
        "month": {
            "gross_ksh": float(month[0] or 0),
            "platform_fee_ksh": float(month[1] or 0),
            "isp_earnings_ksh": float(month[2] or 0),
            "count": month[3] or 0,
        },
        "all_time": {
            "gross_ksh": float(rev[0] or 0),
            "platform_fee_ksh": float(rev[1] or 0),
            "isp_earnings_ksh": float(rev[2] or 0),
            "count": rev[3] or 0,
        },
        "active_sessions": active_count,
        "network": net_status,
    }


# PortalConfigUpdateRequest removed — save is handled by portal_wizard.py

@router.get("/tenants/portal-config")
async def get_portal_config(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Platform admins don't have a portal")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "portal_config": tenant.portal_config,
        "configured": tenant.portal_config is not None,
    }


# REMOVED: POST /portal-config — this conflicted with portal_wizard.py's /api/portal-config
# The wizard uses portal_wizard.py's endpoint which has the correct nested schema.
# This old flat-schema endpoint was silently overwriting wizard saves with empty defaults.



@router.patch("/tenants/{tenant_id}/approve")
async def approve_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_platform_admin),
):
    result = await db.execute(select(Tenant).where(Tenant.id == uuid.UUID(tenant_id)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    was_inactive = not tenant.is_active
    tenant.is_active = True
    await db.commit()

    # Activate admin users and send approval email
    if was_inactive:
        from sqlalchemy import update as sa_update
        from app.models.admin_user import AdminUser as AU
        await db.execute(
            sa_update(AU)
            .where(AU.tenant_id == tenant.id)
            .values(is_active=True)
        )
        await db.commit()

        try:
            import httpx, os
            resend_key = os.environ.get('RESEND_API_KEY', '')
            if resend_key:
                res = await db.execute(select(AdminUser).where(AdminUser.tenant_id == tenant.id))
                isp_admin = res.scalar_one_or_none()
                if isp_admin:
                    await httpx.AsyncClient().post(
                        'https://api.resend.com/emails',
                        headers={'Authorization': f'Bearer {resend_key}', 'Content-Type': 'application/json'},
                        json={
                            'from': 'XwB <onboarding@resend.dev>',
                            'to': [isp_admin.email],
                            'subject': f'Your XwB account is approved - {tenant.name}',
                            'html': f'<div style="font-family:sans-serif;max-width:600px"><h2 style="color:#22c55e">You are approved!</h2><p>Your ISP <strong>{tenant.name}</strong> is now live on XwB.</p><a href="https://wi-bill.vercel.app/login" style="background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:16px">Login to Dashboard</a><p style="margin-top:16px;color:#666;font-size:12px">Login with: {isp_admin.email}</p></div>',
                        },
                        timeout=5.0
                    )
        except Exception:
            pass

    return {"ok": True, "is_active": True, "tenant_id": tenant_id}


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
    was_inactive = not tenant.is_active
    tenant.is_active = data.get("is_active", tenant.is_active)
    await db.commit()

    # If just approved, activate admin users and send email
    if was_inactive and tenant.is_active:
        from sqlalchemy import update as sa_update
        from app.models.admin_user import AdminUser
        await db.execute(
            sa_update(AdminUser)
            .where(AdminUser.tenant_id == tenant.id)
            .values(is_active=True)
        )
        await db.commit()

        # Send approval email
        try:
            import httpx, os
            resend_key = os.environ.get('RESEND_API_KEY', '')
            if resend_key:
                result = await db.execute(
                    select(AdminUser).where(AdminUser.tenant_id == tenant.id)
                )
                isp_admin = result.scalar_one_or_none()
                if isp_admin:
                    await httpx.AsyncClient().post(
                        'https://api.resend.com/emails',
                        headers={'Authorization': f'Bearer {resend_key}', 'Content-Type': 'application/json'},
                        json={
                            'from': 'XwB <onboarding@resend.dev>',
                            'to': [isp_admin.email],
                            'subject': f'Welcome to XwB - Your account is approved!',
                            'html': f'''<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                                <h2 style="color:#22c55e">You are approved!</h2>
                                <p>Your ISP <strong>{tenant.name}</strong> has been approved on XwB.</p>
                                <p>You can now log in and set up your captive portal, configure M-Pesa payments, and start onboarding customers.</p>
                                <div style="margin-top:24px">
                                    <a href="https://wi-bill.vercel.app/login"
                                       style="background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                                        Login to Dashboard
                                    </a>
                                </div>
                                <p style="margin-top:24px;color:#666;font-size:12px">Login with: {isp_admin.email}</p>
                            </div>'''
                        },
                        timeout=5.0
                    )
        except Exception:
            pass  # Email failure never blocks approval

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



@router.get("/tenants/status")
async def get_tenant_status(
    current_user: AdminUser = Depends(require_isp_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get current tenant status for pending approval polling."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Platform admins don't have a tenant")
    
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {
        "tenant_id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "is_active": tenant.is_active,
        "onboarding_complete": current_user.onboarding_complete,
        "status": "active" if tenant.is_active else "pending_approval",
        "message": "Your account is active" if tenant.is_active else "Waiting for admin approval"
    }


@router.get("/tenants/feature-flags")
async def get_my_feature_flags(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get feature flags for the current admin's tenant. Returns all-false for platform admins (no tenant)."""
    if not current_user.tenant_id:
        return {"vouchers": False, "campaigns": False, "loyalty": False, "mikrotik": False, "portal_customization": False, "monthly_subscribers": False, "tv_subscribers": False}
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "vouchers": tenant.has_vouchers,
        "campaigns": tenant.has_campaigns,
        "loyalty": tenant.has_loyalty,
        "mikrotik": tenant.has_mikrotik,
        "portal_customization": tenant.has_portal_customization,
        "monthly_subscribers": tenant.has_monthly_subscribers,
        "tv_subscribers": tenant.has_tv_subscribers,
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant_by_id(
    tenant_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch a single tenant's public profile info. ISP admins may only fetch
    their own tenant; platform admins may fetch any tenant.
    Registered LAST among /tenants/* GET routes so it never shadows the
    more specific paths above (status, mikrotik, dashboard, portal-config).
    """
    try:
        tid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")

    if current_user.role != "platform_admin" and current_user.tenant_id != tid:
        raise HTTPException(status_code=403, detail="Cannot access another tenant")

    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "id": str(tenant.id),
        "slug": tenant.slug,
        "name": tenant.name,
        "is_active": tenant.is_active,
        "commission_rate": float(tenant.commission_rate),
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
    }
