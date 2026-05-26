import uuid
from datetime import datetime, timedelta
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class InviteToken(Base):
    """
    Invite tokens for ISP signup.
    
    Fields:
    - token: Unique cryptographic token (sent in signup link)
    - tenant_id: Which ISP/Tenant this invite belongs to (optional, for org invites)
    - email: Email address this invite was sent to (optional)
    - used_at: When this invite was claimed (None = unused)
    - expires_at: When this invite expires
    - created_at: When this invite was generated
    - created_by: Admin user ID who created this invite
    """
    
    __tablename__ = "invite_tokens"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys=[tenant_id])
    
    def __repr__(self) -> str:
        status = "used" if self.used_at else "unused"
        return f"<InviteToken {self.token[:10]}... ({status})>"
    
    @property
    def is_valid(self) -> bool:
        """Check if token is valid (unused and not expired)"""
        if self.used_at is not None:
            return False
        if self.expires_at < datetime.utcnow():
            return False
        return True
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return self.expires_at < datetime.utcnow()
    
    @classmethod
    def generate_token(cls, hours_valid: int = 24) -> tuple[str, datetime]:
        """
        Generate a new invite token.
        
        Returns:
            (token_string, expires_at_datetime)
        """
        import secrets
        token = secrets.token_urlsafe(32)  # ~43 character cryptographic token
        expires_at = datetime.utcnow() + timedelta(hours=hours_valid)
        return token, expires_at