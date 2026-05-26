import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
 
 
class MpesaCallback(Base):
    __tablename__ = "mpesa_callbacks"
 
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    checkout_request_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    result_code: Mapped[int] = mapped_column(Integer, nullable=False)
    result_desc: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)   # full Daraja payload stored for audit
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
 
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="mpesa_callbacks")
 
    def __repr__(self) -> str:
        return f"<MpesaCallback {self.checkout_request_id} code={self.result_code}>"