import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.mikrotik_config import MikrotikConfig


class ClientDevice(Base):
    __tablename__ = "client_devices"
    __table_args__ = (UniqueConstraint("tenant_id", "mac_address", name="uq_client_device_tenant_mac"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    mac_address: Mapped[str] = mapped_column(String(17), nullable=False, index=True)
    customer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_router_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("mikrotik_configs.id", ondelete="SET NULL"), nullable=True)
    last_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv4 or IPv6
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # "active" | "expired" | "blocked"

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="client_devices")
    last_router: Mapped["MikrotikConfig | None"] = relationship("MikrotikConfig")

    def __repr__(self) -> str:
        return f"<ClientDevice {self.mac_address} tenant={self.tenant_id} status={self.status}>"
