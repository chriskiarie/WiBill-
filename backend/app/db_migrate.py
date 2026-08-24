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
    ("mikrotik_configs.bridge_secret_enc", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS bridge_secret_enc TEXT
    """),
    ("mikrotik_configs.tunnel_token_enc", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS tunnel_token_enc TEXT
    """),
    ("mikrotik_configs.tunnel_id", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS tunnel_id VARCHAR(255)
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
    # ── isp_invites table: predates this self-healing list, migration chain
    # for it was never confirmed applied to prod -- recreate idempotently ──
    ("invitestatus enum type", """
        DO $$ BEGIN
            CREATE TYPE invitestatus AS ENUM ('pending', 'used', 'expired');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
    """),
    ("isp_invites table", """
        CREATE TABLE IF NOT EXISTS isp_invites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token VARCHAR(64) NOT NULL UNIQUE,
            created_by UUID NOT NULL REFERENCES admin_users(id),
            isp_name TEXT,
            status invitestatus NOT NULL DEFAULT 'pending',
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            used_by_tenant_id UUID REFERENCES tenants(id),
            used_by_tenant_name TEXT,
            used_at TIMESTAMP WITH TIME ZONE
        )
    """),
    # The table above may already exist from an older, partial migration --
    # CREATE TABLE IF NOT EXISTS is then a no-op and stale columns stay
    # missing. Cover every column added across the table's migration
    # history individually so this self-heals regardless of which version
    # of the table currently exists in prod.
    ("isp_invites.isp_name column", """
        ALTER TABLE isp_invites ADD COLUMN IF NOT EXISTS isp_name VARCHAR(255)
    """),
    ("isp_invites.used_by_tenant_id column", """
        ALTER TABLE isp_invites ADD COLUMN IF NOT EXISTS used_by_tenant_id UUID REFERENCES tenants(id)
    """),
    ("isp_invites.used_by_tenant_name column", """
        ALTER TABLE isp_invites ADD COLUMN IF NOT EXISTS used_by_tenant_name TEXT
    """),
    ("isp_invites.used_at column", """
        ALTER TABLE isp_invites ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE
    """),
    ("isp_invites.token index", """
        CREATE INDEX IF NOT EXISTS ix_isp_invites_token ON isp_invites(token)
    """),
    ("isp_invites.created_by index", """
        CREATE INDEX IF NOT EXISTS ix_isp_invites_created_by ON isp_invites(created_by)
    """),
    ("isp_invites.status index", """
        CREATE INDEX IF NOT EXISTS ix_isp_invites_status ON isp_invites(status)
    """),
    ("isp_invites.expires_at index", """
        CREATE INDEX IF NOT EXISTS ix_isp_invites_expires_at ON isp_invites(expires_at)
    """),
    # ── Monthly Subscribers Module ──────────────────────────────────────────
    ("tenants.has_monthly_subscribers", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_monthly_subscribers BOOLEAN NOT NULL DEFAULT false
    """),
    ("tenants.has_tv_subscribers", """
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS has_tv_subscribers BOOLEAN NOT NULL DEFAULT false
    """),
    ("subscriber_plans table", """
        CREATE TABLE IF NOT EXISTS subscriber_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(500),
            price_ksh NUMERIC(10,2) NOT NULL,
            bandwidth_down_mbps INTEGER NOT NULL DEFAULT 10,
            bandwidth_up_mbps INTEGER NOT NULL DEFAULT 5,
            client_type VARCHAR(10) NOT NULL DEFAULT 'wifi',
            billing_cycle_days INTEGER NOT NULL DEFAULT 30,
            is_active BOOLEAN NOT NULL DEFAULT true,
            display_order INTEGER NOT NULL DEFAULT 0,
            burst_enabled BOOLEAN NOT NULL DEFAULT false,
            burst_limit_down_mbps INTEGER,
            burst_limit_up_mbps INTEGER,
            priority_queue INTEGER NOT NULL DEFAULT 8,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
    """),
    ("subscriber_plans index", """
        CREATE INDEX IF NOT EXISTS ix_subscriber_plans_tenant_id ON subscriber_plans(tenant_id)
    """),
    ("subscribers table", """
        CREATE TABLE IF NOT EXISTS subscribers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            plan_id UUID REFERENCES subscriber_plans(id) ON DELETE SET NULL,
            account_number VARCHAR(30) NOT NULL,
            client_name VARCHAR(200) NOT NULL,
            phone_number VARCHAR(20) NOT NULL,
            id_number VARCHAR(20),
            email VARCHAR(254),
            installation_address VARCHAR(500),
            installation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            notes VARCHAR(1000),
            networking_ip VARCHAR(45) NOT NULL,
            networking_mac VARCHAR(17),
            networking_vlan INTEGER,
            networking_interface VARCHAR(100),
            networking_gateway VARCHAR(45),
            billing_cycle_date INTEGER NOT NULL DEFAULT 1,
            billing_cycle_days INTEGER NOT NULL DEFAULT 30,
            last_billed_at TIMESTAMP WITH TIME ZONE,
            next_billing_at TIMESTAMP WITH TIME ZONE,
            amount_due_ksh NUMERIC(10,2) NOT NULL DEFAULT 0.0,
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            online_status VARCHAR(20) NOT NULL DEFAULT 'offline',
            last_seen_at TIMESTAMP WITH TIME ZONE,
            data_cap_gb NUMERIC(10,2),
            data_used_today_gb NUMERIC(10,2) NOT NULL DEFAULT 0.0,
            data_used_month_gb NUMERIC(10,2) NOT NULL DEFAULT 0.0,
            data_used_total_gb NUMERIC(12,2) NOT NULL DEFAULT 0.0,
            last_sync_at TIMESTAMP WITH TIME ZONE,
            last_sync_status VARCHAR(50),
            out_of_sync BOOLEAN NOT NULL DEFAULT false,
            out_of_sync_note VARCHAR(500),
            mpesa_receipt_last VARCHAR(50),
            payment_due_reminder_sent BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
    """),
    ("subscribers index tenant", """
        CREATE INDEX IF NOT EXISTS ix_subscribers_tenant_id ON subscribers(tenant_id)
    """),
    ("subscribers index status", """
        CREATE INDEX IF NOT EXISTS ix_subscribers_status ON subscribers(status)
    """),
    ("subscribers index account_number", """
        CREATE INDEX IF NOT EXISTS ix_subscribers_account_number ON subscribers(account_number)
    """),
    ("subscribers unique ip per tenant", """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_subscribers_ip_per_tenant ON subscribers(tenant_id, networking_ip)
    """),
    ("subscribers unique account per tenant", """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_subscribers_account_per_tenant ON subscribers(tenant_id, account_number)
    """),
    ("subscriber_status_logs table", """
        CREATE TABLE IF NOT EXISTS subscriber_status_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
            from_status VARCHAR(30),
            to_status VARCHAR(30) NOT NULL,
            reason VARCHAR(100),
            triggered_by VARCHAR(30) NOT NULL DEFAULT 'system',
            details TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
    """),
    ("subscriber_status_logs index", """
        CREATE INDEX IF NOT EXISTS ix_subscriber_status_logs_subscriber_id ON subscriber_status_logs(subscriber_id)
    """),
    ("subscriber_data_usage table", """
        CREATE TABLE IF NOT EXISTS subscriber_data_usage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
            usage_gb NUMERIC(10,4) NOT NULL,
            interface_name VARCHAR(100),
            rx_bytes BIGINT,
            tx_bytes BIGINT,
            recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
    """),
    ("subscriber_data_usage index", """
        CREATE INDEX IF NOT EXISTS ix_subscriber_data_usage_subscriber_id ON subscriber_data_usage(subscriber_id)
    """),
    ("subscriber_data_usage recorded_at index", """
        CREATE INDEX IF NOT EXISTS ix_subscriber_data_usage_recorded_at ON subscriber_data_usage(recorded_at DESC)
    """),
    ("ipam_pools table", """
        CREATE TABLE IF NOT EXISTS ipam_pools (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            subnet_cidr VARCHAR(45) NOT NULL,
            gateway VARCHAR(45) NOT NULL,
            pool_type VARCHAR(10) NOT NULL DEFAULT 'wifi',
            start_ip VARCHAR(45) NOT NULL,
            end_ip VARCHAR(45) NOT NULL,
            vlan_id INTEGER,
            interface_name VARCHAR(100),
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
    """),
    ("ipam_pools index", """
        CREATE INDEX IF NOT EXISTS ix_ipam_pools_tenant_id ON ipam_pools(tenant_id)
    """),
    ("portal_config_snapshots table", """
        CREATE TABLE IF NOT EXISTS portal_config_snapshots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            version_tag VARCHAR(100) NOT NULL,
            config_snapshot JSONB NOT NULL,
            created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """),
    ("portal_config_snapshots index", """
        CREATE INDEX IF NOT EXISTS ix_portal_config_snapshots_tenant_id ON portal_config_snapshots(tenant_id)
    """),
    # ── Leads table (landing page Request Access) ──────────────────────────
    ("leadstatus enum type", """
        DO $$ BEGIN
            CREATE TYPE leadstatus AS ENUM ('pending', 'contacted', 'converted');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
    """),
    ("leads table", """
        CREATE TABLE IF NOT EXISTS leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            isp_name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            email VARCHAR(254) NOT NULL,
            hotspot_count INTEGER,
            how_heard TEXT,
            status leadstatus NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """),
    # ── Bulk SMS Module ───────────────────────────────────────────────────
    ("sms_logs table", """
        CREATE TABLE IF NOT EXISTS sms_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES admin_users(id),
            subject VARCHAR(200),
            message TEXT NOT NULL,
            template_vars_used VARCHAR(500),
            target_group VARCHAR(50) NOT NULL,
            target_count INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            delivered_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'sending',
            error_message TEXT,
            provider_ref VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            completed_at TIMESTAMPTZ
        )
    """),
    ("sms_logs tenant index", """
        CREATE INDEX IF NOT EXISTS ix_sms_logs_tenant_id ON sms_logs(tenant_id)
    """),
    # ── Outage events, router health checks, client devices ──
    ("outage_events", """
        CREATE TABLE IF NOT EXISTS outage_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            router_id UUID REFERENCES mikrotik_configs(id) ON DELETE SET NULL,
            zone VARCHAR(255),
            source VARCHAR(20) NOT NULL,
            status VARCHAR(30) NOT NULL,
            started_at TIMESTAMPTZ NOT NULL,
            resolved_at TIMESTAMPTZ,
            eta TIMESTAMPTZ,
            description TEXT,
            created_by_id UUID REFERENCES admin_users(id) ON DELETE SET NULL
        )
    """),
    ("outage_events tenant index", """
        CREATE INDEX IF NOT EXISTS ix_outage_events_tenant_id ON outage_events(tenant_id)
    """),
    ("router_health_checks", """
        CREATE TABLE IF NOT EXISTS router_health_checks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            router_id UUID NOT NULL REFERENCES mikrotik_configs(id) ON DELETE CASCADE,
            checked_at TIMESTAMPTZ NOT NULL,
            management_reachable BOOLEAN NOT NULL,
            wan_reachable BOOLEAN
        )
    """),
    ("router_health_checks router index", """
        CREATE INDEX IF NOT EXISTS ix_router_health_checks_router_id ON router_health_checks(router_id)
    """),
    ("router_health_checks checked_at index", """
        CREATE INDEX IF NOT EXISTS ix_router_health_checks_checked_at ON router_health_checks(checked_at)
    """),
    ("client_devices", """
        CREATE TABLE IF NOT EXISTS client_devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            mac_address VARCHAR(17) NOT NULL,
            customer_phone VARCHAR(20),
            last_router_id UUID REFERENCES mikrotik_configs(id) ON DELETE SET NULL,
            last_ip VARCHAR(45),
            first_seen_at TIMESTAMPTZ NOT NULL,
            last_seen_at TIMESTAMPTZ NOT NULL,
            plan_expires_at TIMESTAMPTZ,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            UNIQUE(tenant_id, mac_address)
        )
    """),
    ("client_devices tenant index", """
        CREATE INDEX IF NOT EXISTS ix_client_devices_tenant_id ON client_devices(tenant_id)
    """),
    ("client_devices mac index", """
        CREATE INDEX IF NOT EXISTS ix_client_devices_mac_address ON client_devices(mac_address)
    """),
    # ── Onboarding Tokens (remote device onboarding) ─────────────────────────
    ("onboarding_tokens table", """
        CREATE TABLE IF NOT EXISTS onboarding_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token VARCHAR(64) NOT NULL UNIQUE,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            ros_version VARCHAR(2) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            router_id UUID REFERENCES mikrotik_configs(id) ON DELETE SET NULL,
            registration_data TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """),
    ("onboarding_tokens tenant index", """
        CREATE INDEX IF NOT EXISTS ix_onboarding_tokens_tenant_id ON onboarding_tokens(tenant_id)
    """),
    ("onboarding_tokens token index", """
        CREATE INDEX IF NOT EXISTS ix_onboarding_tokens_token ON onboarding_tokens(token)
    """),
    ("onboarding_tokens status index", """
        CREATE INDEX IF NOT EXISTS ix_onboarding_tokens_status ON onboarding_tokens(status)
    """),
    # ── Onboarding tokens poll token ──────────────────────────────────────────
    ("onboarding_tokens.poll_token_enc", """
        ALTER TABLE onboarding_tokens ADD COLUMN IF NOT EXISTS poll_token_enc TEXT
    """),
    # ── Router polling (router-initiated control plane) ─────────────────────
    ("mikrotik_configs.poll_token_enc", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS poll_token_enc TEXT
    """),
    ("mikrotik_configs.last_poll_at", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS last_poll_at TIMESTAMPTZ
    """),
    ("mikrotik_configs.first_poll_at", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS first_poll_at TIMESTAMPTZ
    """),
    ("router_actions", """
        CREATE TABLE IF NOT EXISTS router_actions (
            id SERIAL PRIMARY KEY,
            router_id UUID NOT NULL REFERENCES mikrotik_configs(id) ON DELETE CASCADE,
            action_type VARCHAR(50) NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            delivered_at TIMESTAMPTZ,
            acked_at TIMESTAMPTZ
        )
    """),
    ("router_actions router index", """
        CREATE INDEX IF NOT EXISTS ix_router_actions_router_id ON router_actions(router_id)
    """),
    ("router_actions status index", """
        CREATE INDEX IF NOT EXISTS ix_router_actions_status ON router_actions(status)
    """),
    # ── Token validity tracking ──────────────────────────────────────────────
    ("mikrotik_configs.token_valid", """
        ALTER TABLE mikrotik_configs ADD COLUMN IF NOT EXISTS token_valid BOOLEAN DEFAULT TRUE
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
