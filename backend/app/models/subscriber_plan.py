import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class ClientType(str, enum.Enum):
    WIFI = "wifi"
    TV = "tv"


class SubscriberPlan(Base):
    __tablename__ = "subscriber_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price_ksh: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    bandwidth_down_mbps: Mapped[int] = mapped_column(Integer, default=10)
    bandwidth_up_mbps: Mapped[int] = mapped_column(Integer, default=5)
    client_type: Mapped[str] = mapped_column(String(10), default="wifi", nullable=False)
    billing_cycle_days: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    burst_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    burst_limit_down_mbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    burst_limit_up_mbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority_queue: Mapped[int] = mapped_column(Integer, default=8)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="subscriber_plans")
    subscribers = relationship("Subscriber", back_populates="plan")

    def __repr__(self) -> str:
        return f"<SubscriberPlan {self.name} Ksh{self.price_ksh}>"
