"""
app/api/routes/admin.py - Admin/Platform-only routes for ISP management
FIXED: Route paths corrected, request body handler added, response fields fixed
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid
import secrets
import os

from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.isp_invite import ISPInvite, InviteStatus
from app.api.routes.auth import get_current_user, require_platform_admin

# ── ENVIRONMENT ───────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://wi-bill.vercel.app")

# ── SCHEMAS ───────────────────────────────────────────────────────────────────

class GenerateInviteRequest(BaseModel):
    """Request to generate a new ISP invite"""
    isp_name: Optional[str] = Field(None, description="ISP name (optional)")
    expires_in_days: int = Field(7, ge=1, le=365, description="Days until expiry")

    class Config:
        json_schema_extra = {
            "example": {
                "isp_name": "MetroFiber Kenya",
                "expires_in_days": 7
            }
        }


class ISPInviteResponse(BaseModel):
    """Response format for generated invite"""
    id: str
    token: str
    url: str  # ← FIXED: Changed from "invite_link" to "url"
    expires_at: datetime
    created_at: datetime
    status: str

    class Config:
        from_attributes = True


class TenantResponse(BaseModel):
    """Response format for tenant approval"""
    id: uuid.UUID
    status: str

    class Config:
        from_attributes = True


router = APIRouter(tags=["admin"])


# ── ROUTES ────────────────────────────────────────────────────────────────────

@router.post("/admin/invites/generate", response_model=ISPInviteResponse)  # ← FIXED: Added "admin/"
async def generate_invite(
    request: GenerateInviteRequest = Body(...),  # ← FIXED: Added request body handler
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> ISPInviteResponse:
    """
    Generate a new ISP invite token (platform_admin only).
    
    Accepts:
    - isp_name: Optional name for reference
    - expires_in_days: How many days until invite expires (1-365, default 7)
    
    Returns:
    - token: The invite token
    - url: Full URL for sharing (built with FRONTEND_URL)
    """
    
    # Validate expiry
    if request.expires_in_days < 1 or request.expires_in_days > 365:
        raise HTTPException(
            status_code=400,
            detail="expires_in_days must be between 1 and 365"
        )
    
    # Generate secure token
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=request.expires_in_days)
    
    # Create invite record
    invite = ISPInvite(
        id=uuid.uuid4(),
        token=token,
        created_by=current_user.id,
        status=InviteStatus.PENDING,
        expires_at=expires_at,
        created_at=now
    )
    
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    
    # ← FIXED: Use environment variable, not hardcoded localhost
    invite_url = f"{FRONTEND_URL}/join?token={token}"
    
    return ISPInviteResponse(
        id=str(invite.id),
        token=invite.token,
        url=invite_url,  # ← FIXED: Return as "url" not "invite_link"
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        status=invite.status.value
    )


@router.get("/admin/invites", response_model=List[ISPInviteResponse])  # ← FIXED: Added "admin/"
async def list_invites(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> List[ISPInviteResponse]:
    """
    List all ISP invites (platform_admin only).
    
    Returns invites sorted by creation date (newest first).
    """
    
    stmt = select(ISPInvite).order_by(ISPInvite.created_at.desc())
    result = await db.execute(stmt)
    invites = result.scalars().all()
    
    return [
        ISPInviteResponse(
            id=str(i.id),
            token=i.token,
            url=f"{FRONTEND_URL}/join?token={i.token}",  # ← FIXED: Use env var
            expires_at=i.expires_at,
            created_at=i.created_at,
            status=i.status.value
        )
        for i in invites
    ]


@router.patch("/admin/tenants/{tenant_id}/approve", response_model=TenantResponse)  # ← FIXED: Added "admin/"
async def approve_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """
    Approve a pending ISP tenant by updating its status to active.
    (platform_admin only)
    """
    
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = True
    if hasattr(tenant, 'pending_approval'):
        tenant.pending_approval = False

    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    
    return TenantResponse(id=tenant.id, status="active")
