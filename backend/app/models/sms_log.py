"""
SMS delivery log — tracks every bulk SMS sent by an ISP to their subscribers.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class SmsLog(Base):
    __tablename__ = "sms_logs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID, ForeignKey("tenants.id"), nullable=False, index=True)
    sender_id = Column(UUID, ForeignKey("admin_users.id"), nullable=True)

    # Message content
    subject = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    template_vars_used = Column(String(500), nullable=True)  # JSON list of vars used

    # Targeting
    target_group = Column(String(50), nullable=False)  # 'all', 'monthly', 'wifi', 'tv', 'active', 'suspended', 'custom'
    target_count = Column(Integer, default=0)  # how many numbers were targeted

    # Delivery stats
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    status = Column(String(20), default="sending")  # sending, completed, partial, failed

    # Metadata
    error_message = Column(Text, nullable=True)
    provider_ref = Column(String(100), nullable=True)  # Africa's Talking batch ID or similar

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
