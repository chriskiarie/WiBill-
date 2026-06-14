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
            "emoji": data.emoji or "globe",
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
                            'from': 'WiBill <onboarding@resend.dev>',
                            'to': [isp_admin.email],
                            'subject': f'Your WiBill account is approved - {tenant.name}',
                            'html': f'<div style="font-family:sans-serif;max-width:600px"><h2 style="color:#22c55e">You are approved!</h2><p>Your ISP <strong>{tenant.name}</strong> is now live on WiBill.</p><a href="https://wi-bill.vercel.app/login" style="background:#22c55e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:16px">Login to Dashboard</a><p style="margin-top:16px;color:#666;font-size:12px">Login with: {isp_admin.email}</p></div>',
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
                            'from': 'WiBill <onboarding@resend.dev>',
                            'to': [isp_admin.email],
                            'subject': f'Welcome to WiBill - Your account is approved!',
                            'html': f'''<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                                <h2 style="color:#22c55e">You are approved!</h2>
                                <p>Your ISP <strong>{tenant.name}</strong> has been approved on WiBill.</p>
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

# ============================================================================
# MIKROTIK CONFIG ROUTES
# ============================================================================

from app.models.mikrotik_config import MikrotikConfig
from app.services.crypto_service import encrypt, decrypt

class MikrotikCreate(BaseModel):
    router_ip: str
    api_port: int = 8728
    api_username: str
    api_password: str | None = None
    hotspot_server: str = "hotspot1"
    nas_ip_address: str | None = None


class MikrotikUpdate(BaseModel):
    router_ip: str | None = None
    api_port: int | None = None
    api_username: str | None = None
    api_password: str | None = None
    hotspot_server: str | None = None
    nas_ip_address: str | None = None


@router.get("/tenants/mikrotik")
async def get_mikrotik_config(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get MikroTik config for current ISP."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")
    return {
        "id": str(cfg.id),
        "router_ip": cfg.router_ip,
        "api_port": cfg.api_port,
        "api_username": cfg.api_username,
        "hotspot_server": cfg.hotspot_server,
        "nas_ip_address": cfg.nas_ip_address,
        "created_at": cfg.created_at.isoformat(),
        "updated_at": cfg.updated_at.isoformat(),
    }


@router.post("/tenants/mikrotik")
async def create_mikrotik_config(
    data: MikrotikCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Create MikroTik config for current ISP."""
    existing = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Config already exists -- use PATCH to update")
    if not data.api_password:
        raise HTTPException(status_code=400, detail="api_password required for initial setup")

    cfg = MikrotikConfig(
        tenant_id=current_user.tenant_id,
        router_ip=data.router_ip,
        api_port=data.api_port,
        api_username=data.api_username,
        api_password_enc=encrypt(data.api_password),
        hotspot_server=data.hotspot_server,
        nas_ip_address=data.nas_ip_address,
    )
    db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    return {"ok": True, "id": str(cfg.id)}


@router.patch("/tenants/mikrotik")
async def update_mikrotik_config(
    data: MikrotikUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Update MikroTik config for current ISP."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Not configured -- use POST first")

    if data.router_ip is not None:      cfg.router_ip        = data.router_ip
    if data.api_port is not None:       cfg.api_port         = data.api_port
    if data.api_username is not None:   cfg.api_username     = data.api_username
    if data.hotspot_server is not None: cfg.hotspot_server   = data.hotspot_server
    if data.nas_ip_address is not None: cfg.nas_ip_address   = data.nas_ip_address
    if data.api_password:               cfg.api_password_enc = encrypt(data.api_password)

    await db.commit()
    return {"ok": True}


@router.post("/tenants/mikrotik/test")
async def test_mikrotik_connection(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Test MikroTik RouterOS API connectivity."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    try:
        from app.services.mikrotik_service import test_connection
        ok = await test_connection(cfg)
        if ok:
            return {"ok": True, "message": f"Connected to {cfg.router_ip}:{cfg.api_port}"}
        else:
            raise HTTPException(status_code=502, detail=f"Router unreachable at {cfg.router_ip}")
    except ImportError:
        # mikrotik_service may not be available -- ping instead
        import asyncio
        proc = await asyncio.create_subprocess_exec(
            "ping", "-n", "1", "-w", "2000", cfg.router_ip,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
        )
        await proc.wait()
        if proc.returncode == 0:
            return {"ok": True, "message": f"{cfg.router_ip} is reachable"}
        raise HTTPException(status_code=502, detail=f"Cannot reach {cfg.router_ip}")


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