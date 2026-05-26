"""
app/models/admin_user.py — ADD onboarding_complete field.

Find the AdminUser class and add this column after is_active:

    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')

Full field reference below — add only the onboarding_complete line if your file differs.
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class AdminRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    ISP_ADMIN = "isp_admin"


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    role: Mapped[AdminRole] = mapped_column(SAEnum(AdminRole), nullable=False, default=AdminRole.ISP_ADMIN)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, server_default='false')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="admin_users")

    def __repr__(self) -> str:
        return f"<AdminUser {self.email} ({self.role})>"