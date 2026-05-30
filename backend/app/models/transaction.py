import uuid
import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.session import Session


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, unique=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    amount_ksh: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    platform_fee_ksh: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    isp_earnings_ksh: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    mpesa_receipt: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    status: Mapped[TransactionStatus] = mapped_column(SAEnum(TransactionStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]), default=TransactionStatus.PENDING, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="transactions")
    session: Mapped["Session"] = relationship("Session", back_populates="transaction")

    def __repr__(self) -> str:
        return f"<Transaction {self.mpesa_receipt} Ksh{self.amount_ksh}>"
