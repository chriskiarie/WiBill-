import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.admin_user import AdminUser


class PortalConfigSnapshot(Base):
    __tablename__ = "portal_config_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    version_tag: Mapped[str] = mapped_column(String(100), nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="portal_snapshots")
    creator: Mapped["AdminUser"] = relationship("AdminUser", back_populates="portal_snapshots", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<PortalConfigSnapshot {self.version_tag} for tenant {self.tenant_id}>"
