import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending_approval", nullable=False)  # pending_approval, active, inactive
    primary_color: Mapped[str] = mapped_column(String(7), default="#00E676")
    support_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.10)
    balance_ksh: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    portal_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    admin_users: Mapped[list["AdminUser"]] = relationship("AdminUser", back_populates="tenant")
    packages: Mapped[list["Package"]] = relationship("Package", back_populates="tenant")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="tenant")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="tenant")
    network_events: Mapped[list["NetworkEvent"]] = relationship("NetworkEvent", back_populates="tenant")
    mpesa_config: Mapped["MpesaConfig"] = relationship("MpesaConfig", back_populates="tenant", uselist=False)
    mikrotik_config: Mapped["MikrotikConfig"] = relationship("MikrotikConfig", back_populates="tenant", uselist=False)
    mpesa_callbacks: Mapped[list["MpesaCallback"]] = relationship("MpesaCallback", back_populates="tenant")
    
    def __repr__(self) -> str:
        return f"<Tenant {self.slug}>"