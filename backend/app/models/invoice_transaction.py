"""
backend/app/models/invoice_transaction.py
Links individual transactions to invoices
"""

from sqlalchemy import Column, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4

from app.core.database import Base


class InvoiceTransaction(Base):
    """
    Links transactions to invoices
    
    Each transaction from a session payment gets linked to the invoice
    for that month. This allows us to:
    - Itemize invoices
    - Track which transactions make up each invoice
    - Regenerate invoices if needed
    - Audit payment history
    
    Attributes:
        id: Unique ID
        invoice_id: Which invoice this belongs to
        transaction_id: Which transaction this is
        amount_ksh: Amount of the transaction
    """
    
    __tablename__ = "invoice_transactions"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Foreign keys
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, index=True)
    
    # Amount
    amount_ksh = Column(Numeric(12, 2), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="transactions")
    transaction = relationship("Transaction")
    
    def __repr__(self):
        return f"<InvoiceTransaction(invoice_id={self.invoice_id}, transaction_id={self.transaction_id}, amount={self.amount_ksh})>"