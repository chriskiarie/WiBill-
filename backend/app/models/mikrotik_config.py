import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer
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
    api_password_enc: Mapped[str] = mapped_column(String(500), nullable=False)   # Fernet encrypted
    hotspot_server: Mapped[str] = mapped_column(String(100), default="hotspot1")
    nas_ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
 
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="mikrotik_config")
 
    def __repr__(self) -> str:
        return f"<MikrotikConfig {self.router_ip}>"