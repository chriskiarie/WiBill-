import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum
 
 
class DarajaEnvironment(str, enum.Enum):
    SANDBOX = "sandbox"
    PRODUCTION = "production"
 
 
class MpesaConfig(Base):
    __tablename__ = "mpesa_configs"
 
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)
    shortcode: Mapped[str] = mapped_column(String(20), nullable=False)
    consumer_key_enc: Mapped[str] = mapped_column(String(500), nullable=False)       # Fernet encrypted
    consumer_secret_enc: Mapped[str] = mapped_column(String(500), nullable=False)    # Fernet encrypted
    passkey_enc: Mapped[str] = mapped_column(String(500), nullable=False)            # Fernet encrypted
    environment: Mapped[DarajaEnvironment] = mapped_column(SAEnum(DarajaEnvironment), default=DarajaEnvironment.SANDBOX)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
 
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="mpesa_config")
 
    def __repr__(self) -> str:
        return f"<MpesaConfig {self.shortcode}>"