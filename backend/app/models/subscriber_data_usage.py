import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SubscriberDataUsage(Base):
    __tablename__ = "subscriber_data_usage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscriber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscribers.id", ondelete="CASCADE"), nullable=False, index=True)
    usage_gb: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    interface_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rx_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    tx_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    subscriber = relationship("Subscriber", back_populates="data_usage_records")

    def __repr__(self) -> str:
        return f"<SubscriberDataUsage {self.subscriber_id} {self.usage_gb}GB>"
