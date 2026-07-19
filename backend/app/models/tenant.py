import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, Numeric, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.admin_user import AdminUser
    from app.models.package import Package
    from app.models.session import Session
    from app.models.transaction import Transaction
    from app.models.network_event import NetworkEvent
    from app.models.mpesa_config import MpesaConfig
    from app.models.mikrotik_config import MikrotikConfig
    from app.models.mpesa_callback import MpesaCallback
    from app.models.invoice import Invoice
    from app.models.voucher import Voucher
    from app.models.loyalty_account import LoyaltyAccount
    from app.models.reward_token import RewardToken
    from app.models.campaign import Campaign
    from app.models.subscriber_plan import SubscriberPlan
from app.models.subscriber import Subscriber
from app.models.ipam_pool import IpamPool
from app.models.portal_config_snapshot import PortalConfigSnapshot


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending_approval", nullable=False)
    primary_color: Mapped[str] = mapped_column(String(7), default="#00E676")
    support_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.10)
    balance_ksh: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    portal_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Invoice tracking fields
    invoice_status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    monthly_fee_ksh: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    next_invoice_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_paid_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avg_days_punctual: Mapped[float | None] = mapped_column(Numeric(5, 1), nullable=True)

    # Feature flag columns (on the tenant, not a separate table)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_vouchers: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_campaigns: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_loyalty: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_mikrotik: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_portal_customization: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_monthly_subscribers: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_tv_subscribers: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Account lock fields
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    locked_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    admin_users: Mapped[list["AdminUser"]] = relationship("AdminUser", back_populates="tenant")
    packages: Mapped[list["Package"]] = relationship("Package", back_populates="tenant")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="tenant")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="tenant")
    network_events: Mapped[list["NetworkEvent"]] = relationship("NetworkEvent", back_populates="tenant")
    mpesa_config: Mapped["MpesaConfig"] = relationship("MpesaConfig", back_populates="tenant", uselist=False)
    mikrotik_config: Mapped["MikrotikConfig"] = relationship("MikrotikConfig", back_populates="tenant", uselist=False)
    mpesa_callbacks: Mapped[list["MpesaCallback"]] = relationship("MpesaCallback", back_populates="tenant")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="tenant", cascade="all, delete-orphan")
    vouchers: Mapped[list["Voucher"]] = relationship("Voucher", back_populates="tenant", cascade="all, delete-orphan")
    loyalty_accounts: Mapped[list["LoyaltyAccount"]] = relationship("LoyaltyAccount", back_populates="tenant", cascade="all, delete-orphan")
    reward_tokens: Mapped[list["RewardToken"]] = relationship("RewardToken", back_populates="tenant", cascade="all, delete-orphan")
    campaigns: Mapped[list["Campaign"]] = relationship("Campaign", back_populates="tenant", cascade="all, delete-orphan")
    subscriber_plans: Mapped[list["SubscriberPlan"]] = relationship("SubscriberPlan", back_populates="tenant", cascade="all, delete-orphan")
    subscribers: Mapped[list["Subscriber"]] = relationship("Subscriber", back_populates="tenant", cascade="all, delete-orphan")
    ipam_pools: Mapped[list["IpamPool"]] = relationship("IpamPool", back_populates="tenant", cascade="all, delete-orphan")
    portal_snapshots: Mapped[list["PortalConfigSnapshot"]] = relationship("PortalConfigSnapshot", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Tenant {self.slug}>"