"""
app/api/routes/admin.py - Admin/Platform-only routes for ISP management
"""

from datetime import datetime, timedelta
from typing import List
import uuid
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import AdminUser, ISPInvite, Tenant, TenantStatus, InviteStatus
from app.security import get_current_user, verify_platform_admin
from app.schemas import (
    ISPInviteCreate, 
    ISPInviteResponse, 
    TenantResponse,
    AdminTenantApprovalUpdate
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/invites/generate", response_model=ISPInviteResponse)
async def generate_invite(
    current_user: AdminUser = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> ISPInviteResponse:
    """
    Generate a new ISP invite link (platform_admin only).
    
    Returns:
    {
        "id": "uuid",
        "token": "signed-token-64-chars",
        "invite_link": "http://localhost:3000/join?ref=signed-token-64-chars",
        "expires_at": "2026-05-25T10:00:00Z",
        "created_at": "2026-05-18T10:00:00Z"
    }
    """
    
    # Generate unique token (64 chars)
    token = secrets.token_urlsafe(48)  # ~64 chars
    
    # Set expiry to 7 days from now
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    # Create invite record
    invite = ISPInvite(
        id=uuid.uuid4(),
        token=token,
        created_by=current_user.id,
        status=InviteStatus.PENDING,
        expires_at=expires_at,
        created_at=datetime.utcnow()
    )
    
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    
    # Build invite link
    invite_link = f"http://localhost:3000/join?ref={token}"  # TODO: Use env var for domain
    
    return ISPInviteResponse(
        id=str(invite.id),
        token=invite.token,
        invite_link=invite_link,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        status=invite.status.value
    )


@router.get("/invites", response_model=List[ISPInviteResponse])
async def list_invites(
    current_user: AdminUser = Depends(verify_platform_admin),
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
            invite_link=f"http://localhost:3000/join?ref={i.token}",
            expires_at=i.expires_at,
            created_at=i.created_at,
            status=i.status.value
        )
        for i in invites
    ]


@router.get("/tenants/pending", response_model=List[TenantResponse])
async def list_pending_tenants(
    current_user: AdminUser = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> List[TenantResponse]:
    """List all pending (unapproved) ISP tenants"""
    
    stmt = select(Tenant).where(
        Tenant.status == TenantStatus.PENDING
    ).order_by(Tenant.created_at.desc())
    
    result = await db.execute(stmt)
    tenants = result.scalars().all()
    
    return [TenantResponse.from_orm(t) for t in tenants]


@router.patch("/tenants/{tenant_id}/approve", response_model=TenantResponse)
async def approve_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """
    Approve a pending ISP tenant.
    Changes status from PENDING to ACTIVE.
    Sends notification to ISP admin.
    """
    
    # Get tenant
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if tenant.status != TenantStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Tenant status is {tenant.status.value}, not pending"
        )
    
    # Update status
    tenant.status = TenantStatus.ACTIVE
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    
    # Send notification to ISP admin
    # TODO: Get ISP admin user and send email/SMS
    # notification_service = NotificationService()
    # await notification_service.send_approval_notification(tenant)
    
    return TenantResponse.from_orm(tenant)


@router.patch("/tenants/{tenant_id}/reject", response_model=TenantResponse)
async def reject_tenant(
    tenant_id: str,
    reason: str = "",
    current_user: AdminUser = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """
    Reject a pending ISP tenant.
    Changes status from PENDING to SUSPENDED.
    Sends rejection notification with reason.
    """
    
    # Get tenant
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if tenant.status != TenantStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Tenant status is {tenant.status.value}, not pending"
        )
    
    # Update status
    tenant.status = TenantStatus.SUSPENDED
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    
    # Send rejection notification
    # TODO: Send notification with reason
    
    return TenantResponse.from_orm(tenant)


@router.post("/tenants/{tenant_id}/activate")
async def manually_activate_tenant(
    tenant_id: str,
    current_user: AdminUser = Depends(verify_platform_admin),
    db: AsyncSession = Depends(get_db)
) -> TenantResponse:
    """Manually activate a suspended tenant"""
    
    stmt = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.status = TenantStatus.ACTIVE
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    
    return TenantResponse.from_orm(tenant)
