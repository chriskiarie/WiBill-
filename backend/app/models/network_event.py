import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum
 
 
class NetworkStatus(str, enum.Enum):
    UP = "up"
    DOWN = "down"
    DEGRADED = "degraded"
 
 
class NetworkEvent(Base):
    __tablename__ = "network_events"
 
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[NetworkStatus] = mapped_column(SAEnum(NetworkStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]), nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    outage_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outage_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
 
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="network_events")
 
    def __repr__(self) -> str:
        return f"<NetworkEvent {self.tenant_id} {self.status} {self.checked_at}>"

