import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class IpamPool(Base):
    __tablename__ = "ipam_pools"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subnet_cidr: Mapped[str] = mapped_column(String(45), nullable=False)
    gateway: Mapped[str] = mapped_column(String(45), nullable=False)
    pool_type: Mapped[str] = mapped_column(String(10), default="wifi")
    start_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    end_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    vlan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interface_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="ipam_pools")

    def __repr__(self) -> str:
        return f"<IpamPool {self.name} {self.subnet_cidr}>"
