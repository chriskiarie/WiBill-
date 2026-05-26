import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum
 
 
class SessionStatus(str, enum.Enum):
    PENDING = "pending"      # STK Push sent, waiting for payment
    ACTIVE = "active"        # Payment confirmed, internet granted
    EXPIRED = "expired"      # Duration elapsed, kicked from MikroTik
    FAILED = "failed"        # Payment failed or timed out
    REVOKED = "revoked"      # Manually revoked by admin
 
 
class Session(Base):
    __tablename__ = "sessions"
 
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)
    mac_address: Mapped[str] = mapped_column(String(17), nullable=False, index=True)  # XX:XX:XX:XX:XX:XX
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    checkout_request_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)  # Daraja reference
    status: Mapped[SessionStatus] = mapped_column(SAEnum(SessionStatus), default=SessionStatus.PENDING, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    reconnect_code: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True, index=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
 
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="sessions")
    package: Mapped["Package"] = relationship("Package", back_populates="sessions")
    transaction: Mapped["Transaction | None"] = relationship("Transaction", back_populates="session", uselist=False)
 
    def __repr__(self) -> str:
        return f"<Session {self.mac_address} {self.status}>"