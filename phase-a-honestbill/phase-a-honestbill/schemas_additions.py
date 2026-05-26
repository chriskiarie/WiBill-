"""
app/schemas.py - ADD these new schemas for Phase A

Keep all existing schemas and add these new ones:
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ==================== ISP INVITE SCHEMAS ====================

class ISPInviteCreate(BaseModel):
    """Create new ISP invite (admin only)"""
    pass  # No body params needed, uses current_user context


class ISPInviteResponse(BaseModel):
    """ISP invite response"""
    id: str
    token: str
    invite_link: str
    status: str  # "pending" | "used" | "expired"
    expires_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class ISPInviteListResponse(BaseModel):
    """List of invites for Batcave"""
    invites: list[ISPInviteResponse]
    total: int


# ==================== TENANT STATUS SCHEMAS ====================

class TenantStatusUpdate(BaseModel):
    """Update tenant status"""
    status: str  # "pending" | "active" | "suspended"


class AdminTenantApprovalUpdate(BaseModel):
    """Admin approval/rejection"""
    action: str  # "approve" | "reject"
    reason: Optional[str] = None


# ==================== EXTENDED USER REGISTER SCHEMA ====================

class UserRegisterWithInvite(BaseModel):
    """Register with invite token (replaces UserRegister)"""
    email: EmailStr
    password: str
    isp_name: str
    phone: str
    # token passed via query param, not body


# ==================== VALIDATION SCHEMAS ====================

class InviteValidationResponse(BaseModel):
    """Response from /join/validate endpoint"""
    valid: bool
    message: str
    expires_at: Optional[datetime] = None


# Keep all your existing schemas:
# - UserLogin
# - TokenResponse
# - UserResponse
# - TenantResponse
# - PackageResponse
# - SessionResponse
# - TransactionResponse
# - etc.
