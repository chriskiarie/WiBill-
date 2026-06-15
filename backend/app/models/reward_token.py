import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class RewardToken(Base):
    """Premium tier — smart tokens bound to phone/MAC with strict expiry."""
    __tablename__ = "reward_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    token_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    bound_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bound_mac: Mapped[str | None] = mapped_column(String(17), nullable=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    redeemed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant")
    session = relationship("Session")
    campaign = relationship("Campaign", back_populates="tokens")

    def __repr__(self) -> str:
        return f"<RewardToken {self.token_code[:12]}... | {'redeemed' if self.redeemed else 'active'}>"
