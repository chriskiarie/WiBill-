import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

FEATURES = ['vouchers', 'campaigns', 'loyalty', 'mikrotik', 'portal_customization']

class FeatureFlag(Base):
    __tablename__ = 'feature_flags'
    __table_args__ = (UniqueConstraint('tenant_id', 'feature_key', name='uq_tenant_feature'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    feature_key = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    tenant = relationship('Tenant', backref='feature_flags')
