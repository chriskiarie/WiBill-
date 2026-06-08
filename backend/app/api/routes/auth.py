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
# Router: /auth endpoints
# In main.py: app.include_router(auth.router, prefix="/api")
# Creates: /api/auth/login, /api/auth/register, etc.
# ============================================================================
router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TenantRegisterRequest(BaseModel):
    """Registration request - signup via invite link"""
    isp_name: str = Field(..., min_length=2, max_length=100, description="ISP/Company name")
    username: str = Field(..., min_length=3, max_length=50, regex="^[a-z0-9_-]+$", description="Unique username (lowercase, alphanumeric, dash, underscore)")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    admin_phone: str = Field(default="254700000000", description="Admin phone number")


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
    """Verify JWT token and return current user"""
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
    """Verify user is platform admin"""
    if current_user.role != AdminRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Only platform admins can access this")
    return current_user


async def require_isp_admin(
    current_user: AdminUser = Depends(get_current_user),
) -> AdminUser:
    """Verify user is ISP admin"""
    if current_user.role != AdminRole.ISP_ADMIN:
        raise HTTPException(status_code=403, detail="Only ISP admins can access this")
    return current_user


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/register", response_model=dict)
async def register(
    data: TenantRegisterRequest,
    token: str = Query(None, description="Invite token from signup link"),
    db: AsyncSession = Depends(get_db),
):
    """
    Register ISP via invite link - NEW FLOW with username
    
    Frontend calls: POST /api/auth/register?token=ABC123
    Body: {isp_name, username, password, admin_phone}
    
    Flow:
    1. Validate invite token
    2. Check username/isp_name not duplicate
    3. Create Tenant with is_active=False (pending approval)
    4. Create AdminUser with username (not email)
    5. Send admin notification (optional - email fires separately)
    6. Return success
    """

    # ====== VALIDATE INVITE TOKEN ======
    if not token:
        raise HTTPException(status_code=400, detail="Invite token required")

    invite_result = await db.execute(
        select(ISPInvite).where(ISPInvite.token == token)
    )
    invite = invite_result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite token")

    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=400, detail="This invite has already been used")

    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite token expired")

    # ====== CHECK DUPLICATES ======
    dup_tenant = await db.execute(
        select(Tenant).where(Tenant.name == data.isp_name)
    )
    if dup_tenant.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="ISP name already registered")

    dup_user = await db.execute(
        select(AdminUser).where(AdminUser.username == data.username)
    )
    if dup_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # ====== CREATE TENANT (INACTIVE - PENDING APPROVAL) ======
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        id=tenant_id,
        name=data.isp_name,
        slug=data.isp_name.lower().replace(" ", "-"),
        is_active=False,  # NOT active until admin approves
        currency="KES",
        commission_rate=10.0,
    )
    db.add(tenant)
    await db.flush()

    # ====== CREATE ADMIN USER ======
    admin_user = AdminUser(
        id=uuid.uuid4(),
        username=data.username,
        email=f"{data.username}@{data.isp_name.lower().replace(' ', '')}.local",  # Generate email from username
        hashed_password=hash_password(data.password),
        full_name=data.isp_name,
        role=AdminRole.ISP_ADMIN,
        tenant_id=tenant.id,
        is_active=False,  # NOT active until admin approves
        onboarding_complete=False,
    )
    db.add(admin_user)

    # ====== MARK INVITE AS USED ======
    invite.status = InviteStatus.USED
    db.merge(invite)

    await db.commit()

    return {
        "ok": True,
        "message": "Account created. Waiting for admin approval.",
        "tenant_id": str(tenant_id),
        "username": data.username,
        "status": "pending_approval",
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Login with username and password.
    Returns JWT token.
    
    Frontend sends: username + password (form-encoded)
    """
    # Find user by username
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is not yet approved. Please wait for admin approval.",
        )

    # Create JWT token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.value,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
    )


@router.get("/me", response_model=dict)
async def get_me(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current logged-in user info"""
    tenant = None
    if current_user.tenant_id:
        result = await db.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = result.scalar_one_or_none()

    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "tenant_id": str(current_user.tenant_id) if current_user.tenant_id else None,
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
        } if tenant else None,
        "is_active": current_user.is_active,
        "onboarding_complete": current_user.onboarding_complete,
    }


@router.post("/validate-token", response_model=ValidateTokenResponse)
async def validate_token(
    token: str = Query(..., description="JWT token to validate"),
    db: AsyncSession = Depends(get_db),
):
    """Validate JWT token and return expiration info"""
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        exp = payload.get("exp")

        if not user_id:
            return ValidateTokenResponse(
                valid=False,
                message="Invalid token",
                expires_at=None,
            )

        result = await db.execute(
            select(AdminUser).where(AdminUser.id == uuid.UUID(user_id))
        )
        user = result.scalar_one_or_none()

        if not user:
            return ValidateTokenResponse(
                valid=False,
                message="User not found",
                expires_at=None,
            )

        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None

        return ValidateTokenResponse(
            valid=True,
            message="Token is valid",
            expires_at=expires_at,
        )

    except Exception as e:
        return ValidateTokenResponse(
            valid=False,
            message=f"Token validation failed: {str(e)}",
            expires_at=None,
        )


@router.post("/change-password", response_model=dict)
async def change_password(
    old_password: str = Query(...),
    new_password: str = Query(...),
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password for current user"""
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Old password is incorrect")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    current_user.hashed_password = hash_password(new_password)
    db.add(current_user)
    await db.commit()

    return {"ok": True, "message": "Password changed successfully"}