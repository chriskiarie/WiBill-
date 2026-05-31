"""
app/models/session.py
"""
from sqlalchemy import String, DateTime, Boolean, UUID, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
import uuid
from enum import Enum as PyEnum
from app.core.database import Base


class SessionStatus(str, PyEnum):
    PENDING_PAYMENT = "pending_payment"
    ACTIVE          = "active"
    EXPIRED         = "expired"
    DISCONNECTED    = "disconnected"
    FAILED          = "failed"


class Session(Base):
    __tablename__ = "sessions"

    id         : Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id  : Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    package_id : Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)

    # Network identifiers
    mac_address : Mapped[str]       = mapped_column(String(17),  nullable=False, index=True)
    ip_address  : Mapped[str]       = mapped_column(String(15),  nullable=False)
    phone_number: Mapped[str | None]= mapped_column(String(20),  nullable=True)

    # Session lifecycle — stored as plain VARCHAR, not a Postgres enum
    status       : Mapped[str]            = mapped_column(String(50), default="pending_payment", nullable=False)
    created_at   : Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    activated_at : Mapped[datetime | None]= mapped_column(DateTime, nullable=True)
    expires_at   : Mapped[datetime]       = mapped_column(DateTime, nullable=False, index=True)
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_seen_at : Mapped[datetime | None]= mapped_column(DateTime, nullable=True)

    # M-Pesa link — set after STK push fires
    checkout_request_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True, index=True)

    # MikroTik integration
    reconnect_code   : Mapped[str | None] = mapped_column(String(32),  nullable=True, unique=True)
    mikrotik_user_id : Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    tenant      = relationship("Tenant",       back_populates="sessions")
    package     = relationship("Package")
    transaction = relationship("Transaction",  back_populates="session", uselist=False)

    def __repr__(self):
        return f"<Session {self.mac_address} | {self.status}>"