"""Auto-schema migration for new columns/tables not yet in prod DB.
Run once at startup. Uses raw SQL with IF NOT EXISTS guards."""

import logging
from sqlalchemy import text as sa_text
from app.core.database import engine

logger = logging.getLogger("honestbill.migrate")

MIGRATIONS = [
    ("vouchers.is_suspended", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false
    """),
    ("vouchers.duration_minutes", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS duration_minutes INTEGER
    """),
    ("vouchers.package_id nullable", """
        ALTER TABLE vouchers ALTER COLUMN package_id DROP NOT NULL
    """),
    ("vouchers.status", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'unused'
    """),
    ("vouchers.note", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS note TEXT
    """),
    ("vouchers.duration_hours", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS duration_hours INTEGER NOT NULL DEFAULT 0
    """),
    ("vouchers.price_ksh", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS price_ksh NUMERIC(10,2) NOT NULL DEFAULT 0.0
    """),
    ("vouchers.is_used", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false
    """),
    ("vouchers.is_active", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    """),
    ("vouchers.used_at", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS used_at TIMESTAMP
    """),
    ("vouchers.mac_address", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)
    """),
    ("vouchers.redeemed_by", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redeemed_by VARCHAR(50)
    """),
    ("vouchers.redeemed_by_mac", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redeemed_by_mac VARCHAR(17)
    """),
    ("vouchers.redeemed_by_phone", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redeemed_by_phone VARCHAR(20)
    """),
    ("vouchers.session_id", """
        ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL
    """),
    ("campaigns table", """
        CREATE TABLE IF NOT EXISTS campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            campaign_type VARCHAR(30) NOT NULL,
            reward_minutes INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            expiry_hours INTEGER NOT NULL DEFAULT 12,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            target_filter TEXT,
            sent_count INTEGER NOT NULL DEFAULT 0,
            redeemed_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            launched_at TIMESTAMP
        )
    """),
    ("campaigns index", """
        CREATE INDEX IF NOT EXISTS ix_campaigns_tenant_id ON campaigns(tenant_id)
    """),
    ("reward_tokens table", """
        CREATE TABLE IF NOT EXISTS reward_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            token_code VARCHAR(64) NOT NULL UNIQUE,
            minutes INTEGER NOT NULL,
            bound_phone VARCHAR(20),
            bound_mac VARCHAR(17),
            campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
            session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
            reason VARCHAR(100),
            redeemed BOOLEAN NOT NULL DEFAULT false,
            redeemed_at TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        )
    """),
    ("reward_tokens index", """
        CREATE INDEX IF NOT EXISTS ix_reward_tokens_tenant_id ON reward_tokens(tenant_id)
    """),
    ("sessions.package_id nullable", """
        ALTER TABLE sessions ALTER COLUMN package_id DROP NOT NULL
    """),
    ("feature_flags table", """
        CREATE TABLE IF NOT EXISTS feature_flags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            feature_key VARCHAR(50) NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT false,
            updated_at TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT uq_tenant_feature UNIQUE (tenant_id, feature_key)
        )
    """),
    ("feature_flags index", """
        CREATE INDEX IF NOT EXISTS ix_feature_flags_tenant_id ON feature_flags(tenant_id)
    """),
    ("audit_logs table", """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            actor_email VARCHAR(255) NOT NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50),
            target_id VARCHAR(100),
            details JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        )
    """),
    ("audit_logs index", """
        CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at DESC)
    """),
    ("notifications table", """
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR(20) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            sender_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            target_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            read_at TIMESTAMP
        )
    """),
    ("notifications index", """
        CREATE INDEX IF NOT EXISTS ix_notifications_target_tenant_id ON notifications(target_tenant_id)
    """),
    # ── Invoice tracking columns (tenants) ────────────────────────────────────
    ("tenants.invoice_status", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) NOT NULL DEFAULT 'active'
    """),
    ("tenants.monthly_fee_ksh", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_fee_ksh NUMERIC(12, 2)
    """),
    ("tenants.next_invoice_date", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_invoice_date TIMESTAMP WITH TIME ZONE
    """),
    ("tenants.last_paid_date", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_paid_date TIMESTAMP WITH TIME ZONE
    """),
    ("tenants.avg_days_punctual", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS avg_days_punctual NUMERIC(5, 1)
    """),
    # ── Tenant feature-flag columns ──────────────────────────────────────────
    ("tenants.is_premium", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false
    """),
    ("tenants.has_vouchers", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_vouchers BOOLEAN NOT NULL DEFAULT true
    """),
    ("tenants.has_campaigns", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_campaigns BOOLEAN NOT NULL DEFAULT false
    """),
    ("tenants.has_loyalty", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_loyalty BOOLEAN NOT NULL DEFAULT false
    """),
    ("tenants.has_mikrotik", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_mikrotik BOOLEAN NOT NULL DEFAULT true
    """),
    ("tenants.has_portal_customization", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_portal_customization BOOLEAN NOT NULL DEFAULT true
    """),
    # ── MikroTik Phase 2 columns ────────────────────────────────────────────
    ("mikrotik_configs.hotspot_profile_name", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS hotspot_profile_name VARCHAR(255) NOT NULL DEFAULT 'XwB_Profile'
    """),
    ("mikrotik_configs.status", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED'
    """),
    ("mikrotik_configs.last_connected_at", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE
    """),
    ("mikrotik_configs.last_error_message", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS last_error_message TEXT
    """),
    ("mikrotik_configs.notes", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS notes TEXT
    """),
    ("mikrotik_active_users table", """
        CREATE TABLE IF NOT EXISTS mikrotik_active_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            router_id UUID NOT NULL REFERENCES mikrotik_configs(id) ON DELETE CASCADE,
            session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
            mac_address VARCHAR(17) NOT NULL,
            username_on_router VARCHAR(255),
            duration_minutes INTEGER NOT NULL,
            speed_limit_kbps INTEGER,
            bandwidth_limit_gb NUMERIC(10,2),
            activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            deactivated_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
    """),
    ("mikrotik_active_users index", """
        CREATE INDEX IF NOT EXISTS ix_mikrotik_active_users_mac_address ON mikrotik_active_users(mac_address)
    """),
    # ── Voucher code length fix ──────────────────────────────────────────────
    ("vouchers.code length to 30", """
        ALTER TABLE vouchers ALTER COLUMN code TYPE VARCHAR(30)
    """),
    ("mpesa_transactions.mpesa_config_id_nullable", """
        ALTER TABLE mpesa_transactions ALTER COLUMN mpesa_config_id DROP NOT NULL
    """),
    ("mpesa_configs.tenant_id_nullable", """
        ALTER TABLE mpesa_configs ALTER COLUMN tenant_id DROP NOT NULL
    """),
    # ── Fix network_events.status from ENUM to VARCHAR ──────────────────────────
    ("network_events.status to varchar", """
        ALTER TABLE network_events ALTER COLUMN status TYPE VARCHAR(20)
    """),
]

async def run_migrations():
    logger.info("=== Running schema migrations ===")
    async with engine.begin() as conn:
        for name, sql in MIGRATIONS:
            try:
                logger.info(f"  Applying: {name}")
                await conn.execute(sa_text(sql))
                logger.info(f"  ✓ {name}")
            except Exception as e:
                logger.warning(f"  ✗ {name} FAILED: {e}")
    logger.info("=== Schema migrations complete ===")
