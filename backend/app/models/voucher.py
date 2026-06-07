"""
app/models/voucher.py
WiFi Voucher model — ISP generates codes, customers redeem at portal
"""
import uuid
import secrets
import string
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


def _gen_code() -> str:
    """Generate a human-readable 10-char voucher code, e.g. X4KP-W9MN"""
    alphabet = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '')
    raw = ''.join(secrets.choice(alphabet) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


class Voucher(Base):
    __tablename__ = "vouchers"

    id:           Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id:   Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)

    code:         Mapped[str]       = mapped_column(String(12), nullable=False, unique=True, index=True, default=_gen_code)
    note:         Mapped[str | None]= mapped_column(Text, nullable=True)          # ISP label e.g. "School event batch"
    batch_id:     Mapped[str | None]= mapped_column(String(36), nullable=True, index=True)  # group vouchers by generation batch

    # value — either linked to a package or a standalone duration/price
    duration_hours: Mapped[int]     = mapped_column(Integer, nullable=False)
    price_ksh:    Mapped[float]     = mapped_column(Numeric(8, 2), nullable=False)

    # status
    is_used:      Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_active:    Mapped[bool]      = mapped_column(Boolean, default=True,  nullable=False)

    # who redeemed it
    redeemed_by_mac:  Mapped[str | None] = mapped_column(String(17),  nullable=True)
    redeemed_by_phone:Mapped[str | None] = mapped_column(String(20),  nullable=True)
    redeemed_at:  Mapped[datetime | None]= mapped_column(DateTime(timezone=True), nullable=True)

    # linked session created on redemption
    session_id:   Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)

    # expiry (optional — if None, voucher never expires until used)
    expires_at:   Mapped[datetime | None]  = mapped_column(DateTime(timezone=True), nullable=True)

    created_at:   Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # relationships
    tenant  = relationship("Tenant")
    package = relationship("Package")

    def __repr__(self):
        return f"<Voucher {self.code} | {'USED' if self.is_used else 'AVAILABLE'}>"