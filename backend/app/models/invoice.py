"""
backend/app/models/invoice.py
Invoice model for monthly billing system
"""

from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
import enum

from app.core.database import Base


class InvoiceStatus(str, enum.Enum):
    """Invoice status enum"""
    DRAFT = "draft"
    SENT = "sent"
    DUE = "due"
    OVERDUE = "overdue"
    PAID = "paid"
    CANCELLED = "cancelled"


class Invoice(Base):
    """
    Monthly invoice for ISP billing
    
    Attributes:
        id: Unique invoice ID
        tenant_id: Which ISP this invoice is for
        month: Month (1-12)
        year: Year (2026, 2027, etc)
        
        gross_revenue: Total revenue from all transactions this month
        platform_fee: WiBill platform fee (10% of gross)
        isp_earnings: ISP earnings (90% of gross)
        amount_due: Amount ISP needs to pay
        
        issued_date: When invoice was created (26th of month)
        due_date: When payment is due (28th of month)
        paid_date: When payment was received (null if unpaid)
        
        status: draft, sent, due, overdue, paid, cancelled
        payment_method: mpesa, bank_transfer, etc
        mpesa_receipt: M-Pesa confirmation number
        
        created_at: When record was created
        updated_at: When record was last updated
        notes: Admin notes
    """
    
    __tablename__ = "invoices"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Foreign key to tenant
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    
    # Invoice period
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)   # 2026, 2027, etc
    
    # Financial amounts
    gross_revenue = Column(Numeric(12, 2), nullable=False, default=0)      # Total transactions
    platform_fee = Column(Numeric(12, 2), nullable=False, default=0)       # 10% of gross
    isp_earnings = Column(Numeric(12, 2), nullable=False, default=0)       # 90% of gross
    amount_due = Column(Numeric(12, 2), nullable=False)                    # What ISP owes
    
    # Important dates
    issued_date = Column(DateTime, nullable=False, default=datetime.utcnow)  # 26th
    due_date = Column(DateTime, nullable=False)                              # 28th
    paid_date = Column(DateTime, nullable=True)                              # When paid
    
    # Status and payment info
    status = Column(Enum(InvoiceStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]), default=InvoiceStatus.DRAFT, nullable=False)
    payment_method = Column(String(50), nullable=True)                      # mpesa, bank, etc
    mpesa_receipt = Column(String(100), unique=True, nullable=True)         # M-Pesa confirmation
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="invoices")
    transactions = relationship("InvoiceTransaction", back_populates="invoice", cascade="all, delete-orphan")
    reminders = relationship("InvoiceReminder", back_populates="invoice", cascade="all, delete-orphan")
    
    # Unique constraint: Only one invoice per tenant per month
    __table_args__ = (
        UniqueConstraint('tenant_id', 'month', 'year', name='unique_invoice_per_month'),
    )
    
    def __repr__(self):
        return f"<Invoice(id={self.id}, tenant_id={self.tenant_id}, month={self.month}/{self.year}, status={self.status})>"
    
    @property
    def is_overdue(self) -> bool:
        """Check if invoice is overdue"""
        return self.status == InvoiceStatus.OVERDUE or (
            self.due_date < datetime.utcnow() and self.status != InvoiceStatus.PAID
        )
    
    @property
    def days_until_due(self) -> int:
        """Days until due date"""
        delta = self.due_date - datetime.utcnow()
        return delta.days
    
    @property
    def days_overdue(self) -> int:
        """Days past due date"""
        if not self.is_overdue:
            return 0
        delta = datetime.utcnow() - self.due_date
        return delta.days
    
    @property
    def invoice_number(self) -> str:
        """Generate invoice number like INV-2026-05"""
        return f"INV-{self.year}-{self.month:02d}"

