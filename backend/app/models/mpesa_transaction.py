import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class MpesaTransactionType(str, enum.Enum):
    SESSION = "session"
    INVOICE = "invoice"
    TOPUP = "topup"
    REFUND = "refund"


class MpesaTransactionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    REVERSED = "reversed"


class MpesaTransaction(Base):
    __tablename__ = "mpesa_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Payment details
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    mpesa_config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mpesa_configs.id", ondelete="CASCADE"), nullable=False)
    amount_ksh: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)

    # Payment type & reference
    payment_type: Mapped[MpesaTransactionType] = mapped_column(
        SAEnum(MpesaTransactionType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True
    )
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    # Daraja request
    merchant_request_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    checkout_request_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True, index=True)
    response_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    response_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Status
    status: Mapped[MpesaTransactionStatus] = mapped_column(
        SAEnum(MpesaTransactionStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=MpesaTransactionStatus.PENDING,
        nullable=False,
        index=True
    )

    # Callback data
    result_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    result_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    transaction_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mpesa_receipt_number: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True, index=True)
    balance_ksh: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Error handling
    error_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_retry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    retry_count: Mapped[int] = mapped_column(default=0, nullable=False)

    # Completion
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    mpesa_config: Mapped["MpesaConfig"] = relationship("MpesaConfig", back_populates="mpesa_transactions")

    __table_args__ = (
        Index("idx_mpesa_tx_tenant_type_status", "tenant_id", "payment_type", "status"),
        Index("idx_mpesa_tx_tenant_date", "tenant_id", "created_at"),
        Index("idx_mpesa_tx_reference", "reference_id", "payment_type"),
    )

    def __repr__(self) -> str:
        return f"<MpesaTransaction(id={self.id}, amount={self.amount_ksh}, status={self.status})>"