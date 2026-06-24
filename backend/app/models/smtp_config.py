import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SmtpConfig(Base):
    __tablename__ = "smtp_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=587)
    username: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    password_enc: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    from_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    from_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    use_tls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_configured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
