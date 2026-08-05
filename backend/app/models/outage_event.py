import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.mikrotik_config import MikrotikConfig
    from app.models.admin_user import AdminUser


class OutageEvent(Base):
    __tablename__ = "outage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    router_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("mikrotik_configs.id", ondelete="SET NULL"), nullable=True)
    zone: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # "auto" | "manual"
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # "investigating" | "confirmed_down" | "degraded" | "resolved"
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="outage_events")
    router: Mapped["MikrotikConfig | None"] = relationship("MikrotikConfig", back_populates="outage_events")
    created_by: Mapped["AdminUser | None"] = relationship("AdminUser")

    def __repr__(self) -> str:
        return f"<OutageEvent {self.tenant_id} {self.source} {self.status} {self.started_at}>"
