"""
app/models/session.py - Session model for WiFi sessions
Tracks: user MAC, IP, payment status, expiry, MikroTik user creation
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer, UUID, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from enum import Enum as PyEnum

class SessionStatus(str, PyEnum):
    """Session lifecycle states"""
    PENDING_PAYMENT = "pending_payment"
    ACTIVE = "active"
    EXPIRED = "expired"
    DISCONNECTED = "disconnected"
    FAILED = "failed"


class Session(Base):
    """
    Represents a WiFi session for a user
    
    States:
    - pending_payment: Waiting for M-Pesa payment
    - active: Payment received, user on network
    - expired: Time limit reached
    - disconnected: User manually disconnected
    """
    
    __tablename__ = "sessions"
    
    # Identifiers
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"), nullable=False)
    
    # Network identifiers
    mac_address = Column(String(17), nullable=False, index=True)  # e.g., "AA:BB:CC:DD:EE:FF"
    ip_address = Column(String(15), nullable=False)  # e.g., "192.168.1.100"
    
    # Session lifecycle
    status = Column(String(50), default="pending_payment", nullable=False)  # pending_payment, active, expired, disconnected
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    activated_at = Column(DateTime, nullable=True)  # When payment confirmed + MikroTik user created
    expires_at = Column(DateTime, nullable=False, index=True)  # When session ends
    disconnected_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)  # Last activity from user
    
    # MikroTik integration
    reconnect_code = Column(String(32), nullable=True, unique=True)  # Username for MikroTik
    mikrotik_user_id = Column(String(128), nullable=True)  # MikroTik API user ID
    
    # Relationships
    tenant = relationship("Tenant", back_populates="sessions")
    package = relationship("Package")
    transaction = relationship("Transaction", back_populates="session", uselist=False)
    
    def __repr__(self):
        return f"<Session {self.mac_address} on {self.tenant_id} - {self.status}>"