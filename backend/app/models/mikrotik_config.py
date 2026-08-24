import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class MikrotikConfig(Base):
    __tablename__ = "mikrotik_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)
    router_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    api_port: Mapped[int] = mapped_column(Integer, default=8728)
    api_username: Mapped[str] = mapped_column(String(100), nullable=False)
    api_password_enc: Mapped[str] = mapped_column(String(500), nullable=False)
    hotspot_server: Mapped[str] = mapped_column(String(100), default="hotspot1")
    hotspot_profile_name: Mapped[str] = mapped_column(String(255), default="XwB_Profile")
    nas_ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="DISCONNECTED")
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    bridge_secret_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    tunnel_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    tunnel_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tunnel_hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    poll_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_poll_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_poll_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    token_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="mikrotik_config")
    health_checks: Mapped[list["RouterHealthCheck"]] = relationship("RouterHealthCheck", back_populates="router", cascade="all, delete-orphan")
    outage_events: Mapped[list["OutageEvent"]] = relationship("OutageEvent", back_populates="router")
    onboarding_token: Mapped["OnboardingToken | None"] = relationship("OnboardingToken", back_populates="router", uselist=False)

    def __repr__(self) -> str:
        return f"<MikrotikConfig {self.router_ip}>"
