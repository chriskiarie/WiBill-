"""ISP Invite Model"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, String, Enum, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    USED = "used"
    EXPIRED = "expired"


class ISPInvite(Base):
    __tablename__ = "isp_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String(64), unique=True, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=False, index=True)
    isp_name = Column(String(255), nullable=True)  # Optional ISP name for the invite
    status = Column(Enum(InviteStatus, name="invitestatus", values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=InviteStatus.PENDING, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = relationship("AdminUser", foreign_keys=[created_by])

    __table_args__ = (
        UniqueConstraint("token", name="uq_isp_invites_token"),
    )

    def is_valid(self) -> bool:
        """Check if invite is still valid (pending and not expired)"""
        return self.status == InviteStatus.PENDING and datetime.now(timezone.utc) < self.expires_at

    def is_expired(self) -> bool:
        """Check if invite has expired"""
        return datetime.now(timezone.utc) > self.expires_at