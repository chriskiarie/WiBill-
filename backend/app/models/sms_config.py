import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class SmsProvider(str, enum.Enum):
    AFRICASTALKING = "africastalking"


class SmsConfigStatus(str, enum.Enum):
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    VERIFIED = "verified"
    FAILED = "failed"
    DISABLED = "disabled"


class SmsConfig(Base):
    __tablename__ = "sms_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, unique=True)

    # Provider
    provider: Mapped[SmsProvider] = mapped_column(
        SAEnum(SmsProvider, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=SmsProvider.AFRICASTALKING,
        nullable=False
    )

    # Africa's Talking credentials (Fernet encrypted)
    api_key_enc: Mapped[str] = mapped_column(String(500), nullable=False)
    username_enc: Mapped[str] = mapped_column(String(500), nullable=False)
    sender_id: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Environment
    environment: Mapped[str] = mapped_column(String(20), default="sandbox", nullable=False)

    # Status
    status: Mapped[SmsConfigStatus] = mapped_column(
        SAEnum(SmsConfigStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=SmsConfigStatus.NOT_CONFIGURED,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_test_status: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="sms_config")

    def __repr__(self) -> str:
        return f"<SmsConfig {self.provider}>"
