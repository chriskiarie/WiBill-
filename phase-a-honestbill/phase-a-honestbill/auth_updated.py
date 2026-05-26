"""
app/api/routes/auth.py - UPDATED with invite token validation

This file shows the UPDATED register endpoint that requires invite token.
Copy the rest of your existing auth.py and replace only the register endpoint.
"""

from datetime import datetime, timedelta
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import AdminUser, Tenant, ISPInvite, InviteStatus, TenantStatus, UserRole
from app.security import hash_password, create_access_token, get_current_user
from app.schemas import UserRegister, UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


# EXISTING ENDPOINTS (keep unchanged):
# - POST /api/auth/login
# - GET /api/auth/me
# - POST /api/auth/refresh

# UPDATED ENDPOINT:

@router.post("/register", response_model=TokenResponse)
async def register(
    user_data: UserRegister,
    token: Optional[str] = None,  # Query param: ?token=invite_token
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """
    Register a new ISP admin user.
    
    REQUIRES valid invite token via query param: /api/auth/register?token=xxx
    
    Creates account with status=PENDING.
    Account only becomes ACTIVE after platform admin approval.
    
    Query Params:
    - token (required): ISP invite token from /join?ref=token
    
    Request Body:
    {
        "email": "isp@example.com",
        "password": "secure_pass",
        "isp_name": "My ISP",
        "phone": "+254700000000"
    }
    
    Response:
    {
        "access_token": "eyJ...",
        "token_type": "bearer",
        "user": {...}
    }
    """
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite token required. Use ?token=xxx"
        )
    
    # Validate invite token
    stmt = select(ISPInvite).where(ISPInvite.token == token)
    result = await db.execute(stmt)
    invite = result.scalar_one_or_none()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite token"
        )
    
    # Check if invite is still valid
    if not invite.is_valid():
        if invite.is_expired():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite token has expired"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite token is no longer valid"
            )
    
    # Check if email already exists
    email_stmt = select(AdminUser).where(AdminUser.email == user_data.email)
    email_result = await db.execute(email_stmt)
    if email_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create tenant (ISP)
    tenant = Tenant(
        id=uuid.uuid4(),
        name=user_data.isp_name,
        slug=user_data.isp_name.lower().replace(" ", "-")[:50],
        status=TenantStatus.PENDING,  # Key: starts as PENDING
        is_active=False,  # Backwards compat
        created_at=datetime.utcnow()
    )
    db.add(tenant)
    await db.flush()  # Get tenant.id before creating user
    
    # Create admin user for this ISP
    admin_user = AdminUser(
        id=uuid.uuid4(),
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
        role=UserRole.ISP_ADMIN,
        tenant_id=tenant.id,
        is_active=True,  # Can login, but ISP is PENDING
        onboarding_complete=False,
        created_at=datetime.utcnow()
    )
    db.add(admin_user)
    
    # Mark invite as USED
    invite.status = InviteStatus.USED
    db.add(invite)
    
    await db.commit()
    await db.refresh(admin_user)
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(admin_user.id), "role": admin_user.role.value}
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(admin_user)
    )


@router.get("/join/validate")
async def validate_invite_token(
    token: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Validate an invite token before showing the registration form.
    
    Used by /join page to check token validity.
    
    Query Params:
    - token (required): invite token
    
    Response:
    {
        "valid": true/false,
        "message": "Token is valid" | "Token expired" | "Invalid token",
        "expires_at": "2026-05-25T..."
    }
    """
    
    stmt = select(ISPInvite).where(ISPInvite.token == token)
    result = await db.execute(stmt)
    invite = result.scalar_one_or_none()
    
    if not invite:
        return {
            "valid": False,
            "message": "Invalid invite token"
        }
    
    if invite.is_expired():
        return {
            "valid": False,
            "message": "Invite token has expired",
            "expires_at": invite.expires_at
        }
    
    if invite.status != InviteStatus.PENDING:
        return {
            "valid": False,
            "message": f"Invite token already {invite.status.value}",
            "expires_at": invite.expires_at
        }
    
    return {
        "valid": True,
        "message": "Token is valid",
        "expires_at": invite.expires_at
    }


# NOTE: Add this to your main.py router inclusion:
# app.include_router(auth.router)
# app.include_router(admin.router)
