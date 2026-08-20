import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Numeric, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
 
 
class Package(Base):
    __tablename__ = "packages"
 
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_ksh: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_label: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "1 Hour", "24 Hours", "7 Days"
    max_devices: Mapped[int] = mapped_column(Integer, default=1)
    speed_limit_mbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
 
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="packages")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="package")
 
    def __repr__(self) -> str:
        return f"<Package {self.name} Ksh{self.price_ksh}>"