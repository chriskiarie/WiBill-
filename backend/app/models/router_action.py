"""
router_action.py — queued instruction a router picks up on its next poll.

This is the delivery mechanism behind router-initiated polling. Instead of
pushing commands into a router through the bridge, the backend enqueues a
RouterAction row; the router polls GET /poll/{router_id}, receives a .rsc
snippet rendering its pending actions, applies it, and acks via
POST /poll/{router_id}/ack.

Status lifecycle: pending -> delivered -> acked  (or -> failed)
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Uuid
from app.core.database import Base


class RouterAction(Base):
    __tablename__ = "router_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    router_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("mikrotik_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)  # add_bypass | remove_bypass | push_portal | ...
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)  # pending | delivered | acked | failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<RouterAction {self.id} {self.action_type} status={self.status}>"
