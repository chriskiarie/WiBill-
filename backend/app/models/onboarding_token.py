import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class OnboardingToken(Base):
    __tablename__ = "onboarding_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    ros_version: Mapped[str] = mapped_column(String(2), nullable=False)  # "6" or "7"
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/used/expired
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    router_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("mikrotik_configs.id", ondelete="SET NULL"), nullable=True)
    registration_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON blob from router
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="onboarding_tokens")
    router: Mapped["MikrotikConfig | None"] = relationship("MikrotikConfig", back_populates="onboarding_token")

    def __repr__(self) -> str:
        return f"<OnboardingToken {self.token[:8]}... status={self.status}>"
