import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum


class PayoutAccountType(str, enum.Enum):
    PERSONAL = "personal"
    BUSINESS = "business"
    PAYBILL = "paybill"


class PayoutAccountStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    INACTIVE = "inactive"
    BLOCKED = "blocked"


class PayoutAccountOwner(str, enum.Enum):
    PLATFORM = "platform"
    ISP = "isp"


class PayoutAccount(Base):
    __tablename__ = "payout_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Owner
    owner_type: Mapped[PayoutAccountOwner] = mapped_column(
        SAEnum(PayoutAccountOwner, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    # Account details
    account_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    account_holder_name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_type: Mapped[PayoutAccountType] = mapped_column(
        SAEnum(PayoutAccountType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=PayoutAccountType.PERSONAL,
        nullable=False
    )

    # Configuration
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Verification
    status: Mapped[PayoutAccountStatus] = mapped_column(
        SAEnum(PayoutAccountStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=PayoutAccountStatus.PENDING,
        nullable=False,
        index=True
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Payment limits
    daily_limit_ksh: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    month_payout_amount_ksh: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)

    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    def __repr__(self) -> str:
        return f"<PayoutAccount(name={self.account_name}, phone={self.phone_number}, verified={self.is_verified})>"

    @property
    def is_ready_for_payout(self) -> bool:
        return self.is_active and self.is_verified and self.status == PayoutAccountStatus.VERIFIED