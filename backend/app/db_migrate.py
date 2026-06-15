"""Auto-schema migration for new columns/tables not yet in prod DB.
Run once at startup. Uses raw SQL so it's independent of Alembic chain issues."""

import logging
from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger("honestbill.migrate")

MIGRATIONS = [
    # 1. Add is_suspended to vouchers
    """
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='vouchers' AND column_name='is_suspended'
        ) THEN
            ALTER TABLE vouchers ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;
        END IF;
    END $$;
    """,
    # 2. Add duration_minutes to vouchers
    """
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='vouchers' AND column_name='duration_minutes'
        ) THEN
            ALTER TABLE vouchers ADD COLUMN duration_minutes INTEGER;
        END IF;
    END $$;
    """,
    # 3. Make package_id nullable in vouchers
    """
    DO $$ BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='vouchers' AND column_name='package_id'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE vouchers ALTER COLUMN package_id DROP NOT NULL;
        END IF;
    END $$;
    """,
    # 4. Create reward_tokens table
    """
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
    );
    CREATE INDEX IF NOT EXISTS ix_reward_tokens_tenant_id ON reward_tokens(tenant_id);
    """,
    # 5. Create campaigns table
    """
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
    );
    CREATE INDEX IF NOT EXISTS ix_campaigns_tenant_id ON campaigns(tenant_id);
    """,
]


async def run_migrations():
    """Run each migration statement. Catches & logs errors so startup continues."""
    logger.info("Running schema migrations...")
    async with engine.begin() as conn:
        for i, sql in enumerate(MIGRATIONS):
            try:
                await conn.execute(text(sql))
            except Exception as e:
                logger.warning(f"Migration {i+1} skipped (may already exist): {e}")
    logger.info("Schema migrations complete")
