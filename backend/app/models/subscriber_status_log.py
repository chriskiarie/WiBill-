import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SubscriberStatusLog(Base):
    __tablename__ = "subscriber_status_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscriber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    triggered_by: Mapped[str] = mapped_column(String(30), default="system")
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    subscriber = relationship("Subscriber", back_populates="status_logs")

    def __repr__(self) -> str:
        return f"<SubscriberStatusLog {self.subscriber_id} {self.from_status}→{self.to_status}>"
