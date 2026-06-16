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
