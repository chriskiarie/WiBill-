import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Voucher(Base):
    __tablename__ = "vouchers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    batch_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="unused", nullable=False)
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_ksh: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    redeemed_by_mac: Mapped[str | None] = mapped_column(String(17), nullable=True)
    redeemed_by_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)
    redeemed_by: Mapped[str | None] = mapped_column(String(50), nullable=True)

    tenant = relationship("Tenant", back_populates="vouchers")
    package = relationship("Package")
    session = relationship("Session")

    def __repr__(self) -> str:
        return f"<Voucher {self.code} | {self.status}{' SUSPENDED' if self.is_suspended else ''}>"
