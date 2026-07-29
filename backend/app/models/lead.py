import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class LeadStatus(str, enum.Enum):
    PENDING = "pending"
    CONTACTED = "contacted"
    CONVERTED = "converted"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    isp_name = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(254), nullable=False)
    hotspot_count = Column(Integer, nullable=True)
    how_heard = Column(Text, nullable=True)
    status = Column(
        Enum(LeadStatus, name="leadstatus", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=LeadStatus.PENDING,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
