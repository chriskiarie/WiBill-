from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.models.admin_user import AdminUser, AdminRole
from app.models.tenant import Tenant
from app.models.isp_invite import ISPInvite, InviteStatus

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TenantRegisterRequest(BaseModel):
    isp_name: str = Field(..., min_length=2, max_length=100)
    isp_slug: str = Field(..., min_length=2, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    admin_phone: str = Field(default="254700000000")
    support_phone: str | None = Field(default=None)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    tenant_id: str | None


class ValidateTokenResponse(BaseModel):
    valid: bool
    message: str
    expires_at: datetime | None = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(AdminUser).where(AdminUser.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    return user


async def require_platform_admin(current_user: AdminUser = Depends(get_current_user)) -> AdminUser:
    if current_user.role != AdminRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Only platform admins can access this")
    return current_user


async def require_isp_admin(current_user: AdminUser = Depends(get_current_user)) -> AdminUser:
    if current_user.role != AdminRole.ISP_ADMIN:
        raise HTTPException(status_code=403, detail="Only ISP admins can access this")
    return current_user


# ============================================================================
# PUBLIC ENDPOINTS
# ============================================================================

@router.get("/validate-token", response_model=ValidateTokenResponse)
async def validate_token(
    token: str = Query(..., description="Invite token to validate"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ISPInvite).where(ISPInvite.token == token))
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=400, detail="Invite token not found")
    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=400, detail="This invite is no longer available (already used or expired)")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invite has expired")

    return ValidateTokenResponse(
        valid=True,
        message="Invite token is valid and ready for signup",
        expires_at=invite.expires_at,
    )


@router.post("/register", response_model=dict)
async def register(
    data: TenantRegisterRequest,
    token: str = Query(None, description="Optional invite token from signup link"),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new ISP.

    Frontend calls: POST /api/auth/register?token=<invite_token>
    Body: {isp_name, isp_slug, admin_email, admin_password, admin_phone, support_phone}

    Flow:
    1. If token provided: validate it (exists, pending, not expired)
    2. Check ISP name/email not already registered
    3. Create Tenant
    5. If token provided: mark invite as USED
    6. Send email notification
    7. Return success
    """

    # ── STEP 1: Validate invite token ────────────────────────────────────────
    if token:
        invite_result = await db.execute(select(ISPInvite).where(ISPInvite.token == token))
        invite = invite_result.scalar_one_or_none()

        if not invite:
            raise HTTPException(status_code=400, detail="Invalid invite token")
        if invite.status != InviteStatus.PENDING:
            raise HTTPException(status_code=400, detail="This invite has already been used or is expired")
        if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This invite has expired")
    else:
        invite = None

    # ── STEP 2: Check duplicates ─────────────────────────────────────────────
    existing_tenant = await db.execute(select(Tenant).where(Tenant.name == data.isp_name))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="ISP name already registered")

    existing_user = await db.execute(select(AdminUser).where(AdminUser.email == data.admin_email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # ── STEP 3: Create Tenant ────────────────────────────────────────────────
    # With invite → pending approval (is_active=False)
    # Without invite → active immediately (is_active=True)
    tenant_is_active = not bool(invite)
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        name=data.isp_name,
        slug=data.isp_slug,
        is_active=tenant_is_active,
        currency="KES",
        commission_rate=10.0,
        support_phone=data.support_phone,
    )
    db.add(tenant)
    await db.flush()

    # ── STEP 4: Create AdminUser ─────────────────────────────────────────────
    # Create AdminUser — model has no username field, email is the identifier
    admin_user = AdminUser(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email=data.admin_email,
        hashed_password=hash_password(data.admin_password),
        full_name=data.isp_name,
        role=AdminRole.ISP_ADMIN,
        is_active=tenant_is_active,         # inactive until approved when using invite
        onboarding_complete=False,
    )
    db.add(admin_user)

    # ── STEP 5: Mark invite as USED ──────────────────────────────────────────
    if invite:
        invite.status = InviteStatus.USED
        db.merge(invite)
        status_msg = "Account created. Waiting for admin approval before you can log in."
        pending = True
    else:
        status_msg = "Account created successfully. You can now log in."
        pending = False

    # ── STEP 6: Commit ───────────────────────────────────────────────────────
    await db.commit()

    # ── STEP 7: Email notification ───────────────────────────────────────────
    if invite:
        try:
            import httpx
            import os
            resend_key = os.environ.get('RESEND_API_KEY', '')
            if resend_key:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        'https://api.resend.com/emails',
                        headers={
                            'Authorization': f'Bearer {resend_key}',
                            'Content-Type': 'application/json',
                        },
                        json={
                            'from': 'WiBill <onboarding@resend.dev>',
                            'to': ['chriskiarie14@gmail.com'],
                            'subject': f'New ISP Pending Approval: {data.isp_name}',
                            'html': f'''
                            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px">
                                <div style="font-size:24px;font-weight:800;color:#E8B84B;margin-bottom:8px">New ISP Registration</div>
                                <p style="color:#888;margin-bottom:24px"><strong style="color:#f0f0f0">{data.isp_name}</strong> has registered and is pending your approval.</p>
                                <table style="border-collapse:collapse;width:100%;margin-bottom:24px">
                                    <tr><td style="padding:10px;color:#666;border-bottom:1px solid #141414">ISP Name</td><td style="padding:10px;border-bottom:1px solid #141414"><strong>{data.isp_name}</strong></td></tr>
                                    <tr><td style="padding:10px;color:#666;border-bottom:1px solid #141414">Admin Email</td><td style="padding:10px;border-bottom:1px solid #141414">{data.admin_email}</td></tr>
                                    <tr><td style="padding:10px;color:#666">Slug</td><td style="padding:10px">/{data.isp_slug}</td></tr>
                                </table>
                                <a href="https://wi-bill.vercel.app/admin/isps"
                                   style="background:#E8B84B;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:800;display:inline-block">
                                    Review in Batcave →
                                </a>
                            </div>''',
                        },
                        timeout=5.0,
                    )
        except Exception:
            pass  # Email failure must never block registration

    return {
        "ok": True,
        "message": status_msg,
        "tenant_id": str(tenant.id),
        "status": "pending_approval" if pending else "active",
        "next_step": "Await admin approval before logging in." if pending else "Log in with your credentials.",
    }


@router.post("/register-isp", response_model=dict)
async def register_isp(
    data: TenantRegisterRequest,
    token: str = Query(..., description="Invite token from signup link"),
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint — delegates to /register."""
    return await register(data=data, token=token, db=db)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password. Returns JWT token."""
    result = await db.execute(select(AdminUser).where(AdminUser.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. You'll receive an email when approved.",
        )

    access_token = create_access_token(str(user.id), user.role, user.tenant_id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
    )


# ============================================================================
# PROTECTED ENDPOINTS
# ============================================================================

@router.get("/me")
async def get_current_user_info(current_user: AdminUser = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "tenant_id": str(current_user.tenant_id) if current_user.tenant_id else None,
        "is_active": current_user.is_active,
        "onboarding_complete": current_user.onboarding_complete,
    }


@router.post("/logout")
async def logout(current_user: AdminUser = Depends(get_current_user)):
    return {"ok": True, "message": "Logged out successfully"}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"ok": True, "message": "Password changed successfully"}


@router.patch("/me")
async def update_profile(
    data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()
    await db.commit()
    return {"ok": True, "full_name": current_user.full_name}