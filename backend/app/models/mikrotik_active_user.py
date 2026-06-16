import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class MikrotikActiveUser(Base):
    __tablename__ = "mikrotik_active_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    router_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mikrotik_configs.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)

    mac_address: Mapped[str] = mapped_column(String(17), nullable=False, index=True)
    username_on_router: Mapped[str | None] = mapped_column(String(255), nullable=True)

    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    speed_limit_kbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bandwidth_limit_gb: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    activated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    router: Mapped["MikrotikConfig"] = relationship("MikrotikConfig")
    session: Mapped["Session"] = relationship("Session")

    def __repr__(self) -> str:
        return f"<MikrotikActiveUser {self.mac_address} | {self.status}>"
