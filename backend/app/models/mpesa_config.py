import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class DarajaEnvironment(str, enum.Enum):
    SANDBOX = "sandbox"
    PRODUCTION = "production"


class MpesaConfigStatus(str, enum.Enum):
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    VERIFIED = "verified"
    FAILED = "failed"
    DISABLED = "disabled"


class MpesaConfig(Base):
    __tablename__ = "mpesa_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Daraja credentials (Fernet encrypted)
    shortcode: Mapped[str] = mapped_column(String(20), nullable=False)
    consumer_key_enc: Mapped[str] = mapped_column(String(500), nullable=False)
    consumer_secret_enc: Mapped[str] = mapped_column(String(500), nullable=False)
    passkey_enc: Mapped[str] = mapped_column(String(500), nullable=False)

    # Environment
    environment: Mapped[DarajaEnvironment] = mapped_column(
        SAEnum(DarajaEnvironment, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=DarajaEnvironment.SANDBOX,
        nullable=False
    )

    # Payout config
    payout_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    payout_account_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    account_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Transaction limits
    min_transaction_amount: Mapped[float] = mapped_column(default=10.0, nullable=False)
    max_daily_transaction_amount: Mapped[float] = mapped_column(default=500000.0, nullable=False)

    # Status
    status: Mapped[MpesaConfigStatus] = mapped_column(
        SAEnum(MpesaConfigStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=MpesaConfigStatus.NOT_CONFIGURED,
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
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="mpesa_config")
    mpesa_transactions: Mapped[list["MpesaTransaction"]] = relationship(
        "MpesaTransaction", back_populates="mpesa_config", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<MpesaConfig {self.shortcode}>"