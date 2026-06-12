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

# ============================================================================
# IMPORTANT: Router prefix is "/auth" ONLY
# In main.py, use: app.include_router(auth.router, prefix="/api")
# This creates routes like: /api/auth/login, /api/auth/validate-token, etc.
# ============================================================================
router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TenantRegisterRequest(BaseModel):
    """Registration request from frontend - matches exactly what frontend sends"""
    isp_name: str = Field(..., min_length=2, max_length=100, description="ISP/Company name")
    isp_slug: str = Field(..., min_length=2, max_length=100, description="ISP slug for URL")
    admin_email: EmailStr = Field(..., description="Admin email address")
    admin_password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    admin_phone: str = Field(default="254700000000", description="Admin phone number")
    support_phone: str | None = Field(default=None, description="Support phone number")


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
    """
    Verify JWT token and return current user
    """
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(
        select(AdminUser).where(AdminUser.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    return user


async def require_platform_admin(
    current_user: AdminUser = Depends(get_current_user),
) -> AdminUser:
    """
    Verify user is platform admin
    """
    if current_user.role != AdminRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Only platform admins can access this")
    return current_user


async def require_isp_admin(
    current_user: AdminUser = Depends(get_current_user),
) -> AdminUser:
    """
    Verify user is ISP admin
    """
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
    """
    Validate an invite token before signup.
    Called by frontend /join page.
    Returns: valid=true if token exists, is pending, and not expired
    """
    result = await db.execute(
        select(ISPInvite).where(ISPInvite.token == token)
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(
            status_code=400,
            detail="Invite token not found",
        )

    if invite.status != InviteStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail="This invite is no longer available (already used or expired)",
        )

    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="This invite has expired",
        )

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
    
    TWO-PATH FLOW:
    
    PATH 1: WITH INVITE TOKEN (invited@isp)
    ─────────────────────────────────────
    1. Frontend: ISP clicks invite link with token
    2. Backend: Validate token (exists, pending, not expired)
    3. Backend: Create Tenant with is_active=TRUE ✅ ACTIVE
    4. Backend: Create AdminUser with is_active=TRUE ✅ ACTIVE
    5. Backend: Mark invite as USED
    6. Frontend: Show loading screen 3 seconds
    7. Frontend: Auto-login with new credentials
    8. Frontend: Redirect to /dashboard (INSTANT ACCESS) ✅
    
    Result: ISP appears in BATCAVE as "Live" immediately
    
    
    PATH 2: COLD SIGNUP (no token)
    ─────────────────────────────
    1. Frontend: ISP creates account without invite
    2. Backend: Create Tenant with is_active=FALSE ⏳ PENDING
    3. Backend: Create AdminUser with is_active=FALSE ⏳ PENDING
    4. Frontend: Show pending approval screen
    5. Admin: Reviews and approves in BATCAVE
    6. Admin: ISP gets email "You're approved"
    7. ISP: Logs in and gets dashboard ✅
    
    Result: ISP appears in BATCAVE as "Pending" until approved
    """

    # ====== STEP 1: Validate invite token (if provided) ======
    if token:
        invite_result = await db.execute(
            select(ISPInvite).where(ISPInvite.token == token)
        )
        invite = invite_result.scalar_one_or_none()

        if not invite:
            raise HTTPException(status_code=400, detail="Invalid invite token")

        if invite.status != InviteStatus.PENDING:
            raise HTTPException(status_code=400, detail="This invite has already been used or is expired")

        if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This invite has expired")
    else:
        invite = None

    # ====== STEP 2: Check ISP name/email not duplicate ======
    existing_tenant = await db.execute(
        select(Tenant).where(Tenant.name == data.isp_name)
    )
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="ISP name already registered")

    existing_user = await db.execute(
        select(AdminUser).where(AdminUser.email == data.admin_email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # ====== STEP 3: Create Tenant ======
    # IMPORTANT: Set is_active based on invite presence
    # With token (invited) → is_active=TRUE
    # Without token (cold signup) → is_active=FALSE
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        name=data.isp_name,
        slug=data.isp_slug,
        is_active=bool(token),  # ✅ TRUE if invited, FALSE if cold signup
        currency="KES",
        commission_rate=10.0,
        support_phone=data.support_phone,
    )
    db.add(tenant)
    await db.flush()

    # ====== STEP 4: Create AdminUser ======
    # IMPORTANT: Set is_active based on invite presence
    # With token (invited) → is_active=TRUE (can login immediately)
    # Without token (cold signup) → is_active=FALSE (waiting for approval)
    admin_user = AdminUser(
        id=uuid.uuid4(),
        email=data.admin_email,
        hashed_password=hash_password(data.admin_password),
        full_name=data.isp_name,
        role=AdminRole.ISP_ADMIN,
        tenant_id=tenant.id,
        is_active=bool(token),  # ✅ TRUE if invited, FALSE if cold signup
        onboarding_complete=False,
    )
    db.add(admin_user)

    # ====== STEP 5: Mark invite as USED (if provided) ======
    if token:
        invite.status = InviteStatus.USED
        db.merge(invite)
        status_msg = "Account created successfully. Your dashboard is ready!"
        next_status = "active"
        next_step = "Redirecting to your dashboard..."
    else:
        status_msg = "Account created. Waiting for admin approval..."
        next_status = "pending_approval"
        next_step = "Check your email for approval notification."

    # ====== STEP 6: Commit ======
    await db.commit()

    return {
        "ok": True,
        "message": status_msg,
        "tenant_id": str(tenant.id),
        "status": next_status,  # ✅ Matches is_active logic
        "next_step": next_step,
    }


@router.post("/register-isp", response_model=dict)
async def register_isp(
    data: TenantRegisterRequest,
    token: str = Query(..., description="Invite token from signup link"),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new ISP via invite token (legacy endpoint).
    Use /register instead.
    """
    return await register(data=data, token=token, db=db)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password.
    Returns JWT token.
    """
    # Find user by email (username field contains email)
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive. Please contact admin.",
        )

    # Create JWT token
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
async def get_current_user_info(
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get info about the logged-in user
    """
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
    """
    Logout (frontend just deletes JWT from localStorage)
    """
    return {"ok": True, "message": "Logged out successfully"}