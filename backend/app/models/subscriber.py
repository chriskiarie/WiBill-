import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, Integer, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Subscriber(Base):
    __tablename__ = "subscribers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("subscriber_plans.id", ondelete="SET NULL"), nullable=True, index=True)

    account_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    client_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    id_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    installation_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    installation_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    networking_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    networking_mac: Mapped[str | None] = mapped_column(String(17), nullable=True)
    networking_vlan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    networking_interface: Mapped[str | None] = mapped_column(String(100), nullable=True)
    networking_gateway: Mapped[str | None] = mapped_column(String(45), nullable=True)

    billing_cycle_date: Mapped[int] = mapped_column(Integer, default=1)
    billing_cycle_days: Mapped[int] = mapped_column(Integer, default=30)
    last_billed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_billing_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    amount_due_ksh: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)

    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False, index=True)
    online_status: Mapped[str] = mapped_column(String(20), default="offline", nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    data_cap_gb: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    data_used_today_gb: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    data_used_month_gb: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    data_used_total_gb: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    out_of_sync: Mapped[bool] = mapped_column(Boolean, default=False)
    out_of_sync_note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    mpesa_receipt_last: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_due_reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="subscribers")
    plan = relationship("SubscriberPlan", back_populates="subscribers")
    status_logs = relationship("SubscriberStatusLog", back_populates="subscriber", cascade="all, delete-orphan")
    data_usage_records = relationship("SubscriberDataUsage", back_populates="subscriber", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Subscriber {self.account_number} | {self.client_name} | {self.status}>"
