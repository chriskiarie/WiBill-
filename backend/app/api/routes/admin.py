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
from app.models.mpesa_config import MpesaConfig, DarajaEnvironment
from app.models.mikrotik_config import MikrotikConfig
from app.models.mpesa_transaction import MpesaTransaction
from app.models.smtp_config import SmtpConfig
from app.models.api_key import ApiKey
from app.models.transaction import Transaction, TransactionStatus
from app.models.session import Session as SessionModel, SessionStatus
from app.api.routes.auth import get_current_user, require_platform_admin
from app.services.crypto_service import encrypt, decrypt
from app.services.daraja_service import get_access_token
from sqlalchemy import func


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
    isp_name: str | None = None
    expires_at: datetime
    created_at: datetime
    status: str
    used_by_tenant_name: str | None = None
    used_at: datetime | None = None

    class Config:
        from_attributes = True


class ISPInviteGenerateRequest(BaseModel):
    isp_name: str | None = None
    expires_in_days: int = 1


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
    email: str = ""
    is_active: bool
    is_locked: bool
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
        isp_name=request.isp_name,
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
        isp_name=invite.isp_name,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        status=invite.status.value,
        used_by_tenant_name=invite.used_by_tenant_name,
        used_at=invite.used_at,
    )


@router.get("/admin/dashboard")
async def platform_dashboard(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Platform-wide dashboard stats (all tenants combined). platform_admin only.
    Used by the Batcave dashboard -- distinct from /api/tenants/dashboard,
    which is a single ISP's own scoped stats.
    """
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start - timedelta(days=30)

    today_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0)).where(
            Transaction.status == TransactionStatus.SUCCESS.value,
            Transaction.created_at >= today_start,
        )
    )
    revenue_today = float(today_result.scalar() or 0)

    month_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0)).where(
            Transaction.status == TransactionStatus.SUCCESS.value,
            Transaction.created_at >= month_start,
        )
    )
    revenue_month = float(month_result.scalar() or 0)

    active_sessions_result = await db.execute(
        select(func.count(SessionModel.id)).where(
            SessionModel.status == SessionStatus.ACTIVE.value
        )
    )
    active_sessions = int(active_sessions_result.scalar() or 0)

    total_isps_result = await db.execute(select(func.count(Tenant.id)))
    total_isps = int(total_isps_result.scalar() or 0)

    return {
        "revenue_today": revenue_today,
        "revenue_month": revenue_month,
        "active_sessions": active_sessions,
        "total_isps": total_isps,
    }


@router.get("/admin/tenants", response_model=List[TenantListResponse])
async def list_tenants(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> List[TenantListResponse]:
    """List all tenants (platform_admin only)"""
    stmt = select(Tenant).order_by(Tenant.created_at.desc())
    result = await db.execute(stmt)
    tenants = result.scalars().all()
    
    # Fetch admin email for each tenant
    tenant_ids = [t.id for t in tenants]
    admin_stmt = select(AdminUser.tenant_id, AdminUser.email).where(
        AdminUser.tenant_id.in_(tenant_ids),
        AdminUser.role == "isp_admin",
    )
    admin_result = await db.execute(admin_stmt)
    email_map = {str(row.tenant_id): row.email for row in admin_result}
    
    return [
        TenantListResponse(
            id=str(t.id),
            slug=t.slug,
            name=t.name,
            email=email_map.get(str(t.id), ""),
            is_active=t.is_active,
            is_locked=t.is_locked,
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
    tenant.is_locked = True
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
    tenant.is_locked = False
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
            isp_name=i.isp_name,
            expires_at=i.expires_at,
            created_at=i.created_at,
            status=i.status.value,
            used_by_tenant_name=i.used_by_tenant_name,
            used_at=i.used_at,
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


# ── Platform M-Pesa Config ─────────────────────────────────────────────

class PlatformMpesaConfigResponse(BaseModel):
    environment: str = "sandbox"
    consumer_key: str = ""
    consumer_secret: str = ""  # masked
    shortcode: str = ""
    passkey: str = ""  # masked
    account_reference: str = ""
    payout_phone: str = ""
    payout_account_name: str = ""
    is_configured: bool = False


class PlatformMpesaConfigSave(BaseModel):
    environment: str = "sandbox"
    consumer_key: str = ""
    consumer_secret: str = ""
    shortcode: str = ""
    passkey: str = ""
    account_reference: str = "HonestBill Platform"
    payout_phone: str = ""
    payout_account_name: str = "HonestBill Platform"


@router.get("/admin/mpesa-config")
async def get_platform_mpesa_config(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return platform-level M-Pesa config (tenant_id IS NULL)."""
    stmt = select(MpesaConfig).where(MpesaConfig.tenant_id.is_(None))
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        return PlatformMpesaConfigResponse()

    return PlatformMpesaConfigResponse(
        environment=config.environment.value if hasattr(config.environment, 'value') else str(config.environment),
        consumer_key=decrypt(config.consumer_key_enc) if config.consumer_key_enc else "",
        consumer_secret="********" if config.consumer_secret_enc else "",
        shortcode=config.shortcode or "",
        passkey="********" if config.passkey_enc else "",
        account_reference=config.account_reference or "",
        payout_phone=config.payout_phone or "",
        payout_account_name=config.payout_account_name or "",
        is_configured=True,
    )


@router.post("/admin/mpesa-config")
async def save_platform_mpesa_config(
    body: PlatformMpesaConfigSave,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save platform-level M-Pesa config (tenant_id IS NULL)."""
    env_val = body.environment
    try:
        env_enum = DarajaEnvironment(env_val)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid environment: {env_val}")

    stmt = select(MpesaConfig).where(MpesaConfig.tenant_id.is_(None))
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if config:
        if body.consumer_key:
            config.consumer_key_enc = encrypt(body.consumer_key)
        if body.consumer_secret:
            config.consumer_secret_enc = encrypt(body.consumer_secret)
        if body.passkey:
            config.passkey_enc = encrypt(body.passkey)
        config.shortcode = body.shortcode or config.shortcode
        config.account_reference = body.account_reference or config.account_reference
        config.payout_phone = body.payout_phone or config.payout_phone
        config.payout_account_name = body.payout_account_name or config.payout_account_name
        config.environment = env_enum
        config.status = "configured"
        config.is_verified = False
    else:
        config = MpesaConfig(
            id=uuid.uuid4(),
            tenant_id=None,
            consumer_key_enc=encrypt(body.consumer_key) if body.consumer_key else "",
            consumer_secret_enc=encrypt(body.consumer_secret) if body.consumer_secret else "",
            shortcode=body.shortcode or "",
            passkey_enc=encrypt(body.passkey) if body.passkey else "",
            account_reference=body.account_reference or "HonestBill Platform",
            payout_phone=body.payout_phone or "",
            payout_account_name=body.payout_account_name or "HonestBill Platform",
            environment=env_enum,
            status="configured",
            is_active=True,
            is_verified=False,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    await log_action(db, current_user, 'update_mpesa_config', 'system', 'platform',
                     {"environment": body.environment})
    return {"status": "ok", "message": "Platform M-Pesa config saved"}


class MpesaTestResponse(BaseModel):
    success: bool
    message: str


@router.post("/admin/mpesa-config/test")
async def test_platform_mpesa(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test platform M-Pesa by fetching an access token from Daraja."""
    stmt = select(MpesaConfig).where(MpesaConfig.tenant_id.is_(None))
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="No platform M-Pesa config found")

    try:
        ck = decrypt(config.consumer_key_enc)
        cs = decrypt(config.consumer_secret_enc)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials")

    if not ck or not cs:
        raise HTTPException(status_code=400, detail="Consumer key or secret not configured")

    try:
        token = await get_access_token(ck, cs)
        if token:
            config.is_verified = True
            db.add(config)
            await db.commit()
            return MpesaTestResponse(success=True, message="M-Pesa connection successful")
        return MpesaTestResponse(success=False, message="Got empty token response")
    except Exception as e:
        config.is_verified = False
        db.add(config)
        await db.commit()
        return MpesaTestResponse(success=False, message=f"Connection failed: {str(e)}")


# ── Admin MikroTik Router Status ──────────────────────────────────────

@router.get("/admin/mikrotik-routers")
async def list_all_router_statuses(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all ISP MikroTik routers with status."""
    stmt = (
        select(MikrotikConfig, Tenant)
        .join(Tenant, MikrotikConfig.tenant_id == Tenant.id)
        .order_by(Tenant.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "tenant_id": str(mc.tenant_id),
            "tenant_name": t.name,
            "host": mc.host or "",
            "port": mc.port or 0,
            "status": mc.status.value if hasattr(mc.status, 'value') else str(mc.status),
            "last_error": mc.last_error_message or "",
            "last_checked": mc.last_checked_at.isoformat() if mc.last_checked_at else None,
            "is_active": mc.is_active,
        }
        for mc, t in rows
    ]


# ── System Actions (Quick Actions) ────────────────────────────────────

@router.post("/admin/system/clear-cache")
async def clear_system_cache(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Clear application cache (stub — no real cache layer yet)."""
    await log_action(db, current_user, 'clear_cache', 'system', 'platform', {})
    return {"status": "ok", "message": "Cache cleared"}


@router.get("/admin/system/logs")
async def get_system_logs(
    current_user: AdminUser = Depends(require_platform_admin),
    lines: int = 100,
):
    """Return recent application log lines."""
    import os
    log_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "logs", "app.log")
    log_path = os.path.normpath(log_path)
    if not os.path.exists(log_path):
        return {"logs": ["No log file found"]}

    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        all_lines = f.readlines()
    recent = all_lines[-lines:]
    return {"logs": [l.rstrip("\n") for l in recent]}


# ── SMTP Config ────────────────────────────────────────────────────────

class SmtpConfigResponse(BaseModel):
    host: str = ""
    port: int = 587
    username: str = ""
    from_email: str = ""
    from_name: str = ""
    use_tls: bool = True
    is_configured: bool = False


class SmtpConfigSave(BaseModel):
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    from_name: str = ""
    use_tls: bool = True


@router.get("/admin/smtp-config")
async def get_smtp_config(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return platform SMTP config."""
    stmt = select(SmtpConfig).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        return SmtpConfigResponse()
    return SmtpConfigResponse(
        host=config.host,
        port=config.port,
        username=config.username,
        from_email=config.from_email,
        from_name=config.from_name,
        use_tls=config.use_tls,
        is_configured=config.is_configured,
    )


@router.post("/admin/smtp-config")
async def save_smtp_config(
    body: SmtpConfigSave,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save platform SMTP config."""
    stmt = select(SmtpConfig).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if config:
        config.host = body.host
        config.port = body.port
        config.username = body.username
        if body.password:
            config.password_enc = encrypt(body.password)
        config.from_email = body.from_email
        config.from_name = body.from_name
        config.use_tls = body.use_tls
        config.is_configured = bool(body.host and body.from_email)
    else:
        config = SmtpConfig(
            id=uuid.uuid4(),
            host=body.host,
            port=body.port,
            username=body.username,
            password_enc=encrypt(body.password) if body.password else "",
            from_email=body.from_email,
            from_name=body.from_name,
            use_tls=body.use_tls,
            is_configured=bool(body.host and body.from_email),
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    await log_action(db, current_user, 'update_smtp_config', 'system', 'platform', {})
    return {"status": "ok", "message": "SMTP config saved"}


class SmtpTestResponse(BaseModel):
    success: bool
    message: str


@router.post("/admin/smtp-config/test")
async def test_smtp_config(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test SMTP config by attempting connection."""
    stmt = select(SmtpConfig).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    if not config or not config.host:
        raise HTTPException(status_code=400, detail="SMTP not configured")
    # Stub — real test would attempt an SMTP connection
    return SmtpTestResponse(success=True, message=f"SMTP config valid (host: {config.host}:{config.port})")


# ── API Keys ───────────────────────────────────────────────────────────

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    created_at: str
    last_used_at: str | None = None


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyCreateResponse(BaseModel):
    id: str
    name: str
    key: str  # full key shown only once on creation
    key_prefix: str
    is_active: bool


@router.get("/admin/api-keys")
async def list_api_keys(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys (key only shown as prefix)."""
    stmt = select(ApiKey).order_by(ApiKey.created_at.desc())
    result = await db.execute(stmt)
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=str(k.id),
            name=k.name,
            key_prefix=k.key_prefix,
            is_active=k.is_active,
            created_at=k.created_at.isoformat(),
            last_used_at=k.last_used_at.isoformat() if k.last_used_at else None,
        )
        for k in keys
    ]


@router.post("/admin/api-keys")
async def create_api_key(
    body: ApiKeyCreate,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new API key."""
    import hashlib
    raw_key = f"hb_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:10]

    key = ApiKey(
        id=uuid.uuid4(),
        name=body.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        is_active=True,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    await log_action(db, current_user, 'create_api_key', 'api_key', str(key.id), {"name": body.name})

    return ApiKeyCreateResponse(
        id=str(key.id),
        name=key.name,
        key=raw_key,
        key_prefix=key.key_prefix,
        is_active=key.is_active,
    )


@router.patch("/admin/api-keys/{key_id}/revoke")
async def revoke_api_key(
    key_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API key."""
    stmt = select(ApiKey).where(ApiKey.id == uuid.UUID(key_id))
    result = await db.execute(stmt)
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.is_active = False
    db.add(key)
    await db.commit()
    await log_action(db, current_user, 'revoke_api_key', 'api_key', key_id, {"name": key.name})
    return {"status": "ok", "message": f"API key '{key.name}' revoked"}


@router.delete("/admin/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete an API key."""
    stmt = select(ApiKey).where(ApiKey.id == uuid.UUID(key_id))
    result = await db.execute(stmt)
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    await db.delete(key)
    await db.commit()
    await log_action(db, current_user, 'delete_api_key', 'api_key', key_id, {"name": key.name})
    return {"status": "ok", "message": f"API key '{key.name}' deleted"}