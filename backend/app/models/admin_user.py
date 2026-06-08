"""AdminUser model - ISP admins and platform admins"""
from sqlalchemy import String, Boolean, DateTime, ForeignKey, UUID, Enum as SAEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from enum import Enum
from datetime import datetime
import uuid

from app.core.database import Base


class AdminRole(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    ISP_ADMIN = "isp_admin"


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True
    )
    
    # NEW: username for login (unique, used instead of email)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True, default="")
    
    # Email still stored for notifications
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    role: Mapped[AdminRole] = mapped_column(SAEnum(AdminRole), nullable=False, default=AdminRole.ISP_ADMIN)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(datetime.timezone.utc))
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="admin_users")

    def __repr__(self) -> str:
        return f"<AdminUser {self.username} ({self.role})>"