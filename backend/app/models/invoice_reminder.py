"""
backend/app/models/invoice_reminder.py
Tracks invoice reminder emails sent to ISPs
"""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
import enum

from app.core.database import Base


class EmailStatus(str, enum.Enum):
    """Email delivery status"""
    PENDING = "pending"
    SENT = "sent"
    BOUNCED = "bounced"
    FAILED = "failed"


class InvoiceReminder(Base):
    """
    Tracks reminder emails sent to ISPs
    
    When an invoice is created on the 26th, we send an email.
    When the 28th approaches (2 days before due), we send a reminder.
    This table tracks all reminders sent so we can:
    - Not send duplicates
    - Track email delivery
    - Handle bounces
    - Audit communication
    
    Attributes:
        id: Unique ID
        invoice_id: Which invoice this reminder is for
        days_before_due: How many days before due date (2)
        sent_at: When email was sent
        email_address: Email address it was sent to
        email_status: pending, sent, bounced, failed
    """
    
    __tablename__ = "invoice_reminders"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Foreign key
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)
    
    # Reminder details
    days_before_due = Column(Integer, nullable=False, default=2)  # Usually 2 days
    email_address = Column(String(255), nullable=False)
    email_status = Column(Enum(EmailStatus), default=EmailStatus.PENDING, nullable=False)
    
    # Timestamps
    sent_at = Column(DateTime, nullable=True)                                    # When actually sent
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)      # When record created
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="reminders")
    
    def __repr__(self):
        return f"<InvoiceReminder(invoice_id={self.invoice_id}, email={self.email_address}, status={self.email_status})>"
    
    @property
    def is_sent(self) -> bool:
        """Check if reminder was actually sent"""
        return self.email_status == EmailStatus.SENT