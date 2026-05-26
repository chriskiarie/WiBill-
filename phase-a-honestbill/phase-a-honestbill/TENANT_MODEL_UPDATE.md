"""
UPDATED: app/models/tenant.py
Add TenantStatus enum and status field to Tenant model

Replace the is_active field with proper status enum:
"""

# Add this at the top of the tenant.py file after imports:

import enum

class TenantStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"


# Add status field to Tenant class (replace is_active Boolean):
# OLD: is_active = Column(Boolean, default=True, nullable=False)
# NEW:
status = Column(
    Enum(TenantStatus), 
    nullable=False, 
    default=TenantStatus.PENDING,
    index=True
)

# Keep a helper property for backwards compatibility:
@property
def is_active(self) -> bool:
    """Check if tenant is active"""
    return self.status == TenantStatus.ACTIVE

# Add this property to Tenant class:
@property
def is_pending(self) -> bool:
    """Check if tenant is pending approval"""
    return self.status == TenantStatus.PENDING

@property
def is_suspended(self) -> bool:
    """Check if tenant is suspended"""
    return self.status == TenantStatus.SUSPENDED
