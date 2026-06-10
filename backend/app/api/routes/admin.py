"""
app/api/routes/admin.py - Admin/Platform-only routes for ISP management
"""

from datetime import datetime, timedelta, timezone
from typing import List
import uuid
import secrets
import os

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
# Pull from the individual model files to ensure zero barrel-import bugs
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.isp_invite import ISPInvite, InviteStatus
from app.api.routes.auth import get_current_user, require_platform_admin

# ── INLINE SCHEMAS (Fixes No module named 'app.schemas') ─────────────────────
class GenerateInviteRequest(BaseModel):
    isp_name: str
    expires_in_days: int = 7

class ISPInviteResponse(BaseModel):
    id: str
    token: str
    invite_link: str
    expires_at: datetime
    created_at: datetime
    status: str
    isp_name: str | None = None

    class Config:
        from_attributes = True

class TenantResponse(BaseModel):
    id: uuid.UUID
    # Add any fallback fields if your UI expects specific attributes on return
    status: str

    class Config:
        from_attributes = True

router = APIRouter(tags=["admin"])

# Get the frontend URL from env, fallback to production
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://wi-bill.vercel.app")


@router.post("/invites/generate", response_model=ISPInviteResponse)
async def generate_invite(
    req: GenerateInviteRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> ISPInviteResponse:
    """Generate a new ISP invite link (platform_admin only)."""
    if not req.isp_name or not req.isp_name.strip():
        raise HTTPException(status_code=400, detail="isp_name is required and cannot be empty")
    
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)
    created_at = datetime.now(timezone.utc)
    
    invite = ISPInvite(
        id=uuid.uuid4(),
        token=token,
        created_by=current_user.id,
        status=InviteStatus.PENDING,
        expires_at=expires_at,
        created_at=created_at,
        isp_name=req.isp_name.strip()  # Store the ISP name
    )
    
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    
    # Use production URL for invite link
    invite_link = f"{FRONTEND_URL}/join?ref={token}"
    
    return ISPInviteResponse(
        id=str(invite.id),
        token=invite.token,
        invite_link=invite_link,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        status=invite.status.value,
        isp_name=invite.isp_name
    )


@router.get("/invites", response_model=List[ISPInviteResponse])
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
            invite_link=f"{FRONTEND_URL}/join?ref={i.token}",
            expires_at=i.expires_at,
            created_at=i.created_at,
            status=i.status.value,
            isp_name=getattr(i, 'isp_name', None)
        )
        for i in invites
    ]


@router.patch("/tenants/{tenant_id}/approve", response_model=TenantResponse)
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
    await db.commit()
    await db.refresh(tenant)
    
    return TenantResponse(id=tenant.id, status="active")