"""
app/api/routes/admin.py - Admin/Platform-only routes for ISP management
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid
import secrets
import os
import httpx

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.admin_user import AdminUser, AdminRole
from app.models.tenant import Tenant
from app.models.isp_invite import ISPInvite, InviteStatus
from app.api.routes.auth import get_current_user, require_platform_admin

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://wi-bill.vercel.app")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

class GenerateInviteRequest(BaseModel):
    isp_name: Optional[str] = Field(None)
    expires_in_days: int = Field(7, ge=1, le=365)

class ISPInviteResponse(BaseModel):
    id: str
    token: str
    url: str
    expires_at: datetime
    created_at: datetime
    status: str
    class Config:
        from_attributes = True

class TenantResponse(BaseModel):
    id: uuid.UUID
    status: str
    class Config:
        from_attributes = True

router = APIRouter(tags=["admin"])


async def send_approval_email(isp_name: str, admin_email: str):
    """Send approval email to ISP admin via Resend."""
    if not RESEND_API_KEY:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "WiBill <onboarding@resend.dev>",
                    "to": [admin_email],
                    "subject": f"Your WiBill ISP account is approved!",
                    "html": f"""
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                        <h1 style="font-size: 24px; color: #111;">Welcome to WiBill, {isp_name}!</h1>
                        <p style="color: #444; font-size: 15px;">Your ISP account has been approved. You can now log in and set up your hotspot portal.</p>
                        <a href="{FRONTEND_URL}/login" style="display: inline-block; margin-top: 24px; padding: 14px 28px; background: #1a6bff; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
                            Access Your Dashboard
                        </a>
                        <p style="margin-top: 32px; color: #888; font-size: 12px;">WiBill — ISP Management Portal</p>
                    </div>
                    """,
                },
                timeout=10,
            )
    except Exception as e:
        print(f"Email send failed: {e}")


@router.post("/invites/generate", response_model=ISPInviteResponse)
async def generate_invite(
    request: GenerateInviteRequest,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> ISPInviteResponse:
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=request.expires_in_days)

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

    invite_url = f"{FRONTEND_URL}/login?token={token}"

    return ISPInviteResponse(
        id=str(invite.id),
        token=invite.token,
        url=invite_url,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        status=invite.status.value
    )


@router.get("/invites", response_model=List[ISPInviteResponse])
async def list_invites(
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> List[ISPInviteResponse]:
    stmt = select(ISPInvite).order_by(ISPInvite.created_at.desc())
    result = await db.execute(stmt)
    invites = result.scalars().all()
    return [
        ISPInviteResponse(
            id=str(i.id),
            token=i.token,
            url=f"{FRONTEND_URL}/login?token={i.token}",
            expires_at=i.expires_at,
            created_at=i.created_at,
            status=i.status.value
        )
        for i in invites
    ]


@router.patch("/tenants/{tenant_id}/approve", response_model=TenantResponse)
async def approve_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.is_active = True
    tenant.status = "active"
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)

    # Find ISP admin email and send approval email
    admin_stmt = select(AdminUser).where(
        AdminUser.tenant_id == tenant.id,
        AdminUser.role == AdminRole.ISP_ADMIN
    )
    admin_result = await db.execute(admin_stmt)
    isp_admin = admin_result.scalar_one_or_none()
    if isp_admin:
        await send_approval_email(tenant.name, isp_admin.email)

    return TenantResponse(id=tenant.id, status="active")
