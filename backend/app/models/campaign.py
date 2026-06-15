import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Campaign(Base):
    """Premium tier — engagement campaigns (win-back, loyalty rewards, etc.)."""
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(30), nullable=False)
    reward_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    target_filter: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    redeemed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    launched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tenant = relationship("Tenant", back_populates="campaigns")
    tokens = relationship("RewardToken", back_populates="campaign", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Campaign {self.name} | {self.status}>"
