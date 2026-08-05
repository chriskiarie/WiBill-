import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.mikrotik_config import MikrotikConfig


class RouterHealthCheck(Base):
    __tablename__ = "router_health_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    router_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mikrotik_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    management_reachable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    wan_reachable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # null if management unreachable

    # Relationships
    router: Mapped["MikrotikConfig"] = relationship("MikrotikConfig", back_populates="health_checks")

    def __repr__(self) -> str:
        return f"<RouterHealthCheck {self.router_id} mgmt={self.management_reachable} wan={self.wan_reachable} {self.checked_at}>"
