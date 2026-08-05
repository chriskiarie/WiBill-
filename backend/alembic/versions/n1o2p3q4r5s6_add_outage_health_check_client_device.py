"""add outage_events, router_health_checks, client_devices tables

Revision ID: n1o2p3q4r5s6
Revises: m1n2o3p4q5r6
Create Date: 2026-08-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = 'n1o2p3q4r5s6'
down_revision = 'm1n2o3p4q5r6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'outage_events' not in tables:
        op.create_table(
            'outage_events',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('router_id', UUID(as_uuid=True), sa.ForeignKey('mikrotik_configs.id', ondelete='SET NULL'), nullable=True),
            sa.Column('zone', sa.String(255), nullable=True),
            sa.Column('source', sa.String(20), nullable=False),
            sa.Column('status', sa.String(30), nullable=False),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('eta', sa.DateTime(timezone=True), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_by_id', UUID(as_uuid=True), sa.ForeignKey('admin_users.id', ondelete='SET NULL'), nullable=True),
        )

    if 'router_health_checks' not in tables:
        op.create_table(
            'router_health_checks',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('router_id', UUID(as_uuid=True), sa.ForeignKey('mikrotik_configs.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('checked_at', sa.DateTime(timezone=True), nullable=False, index=True),
            sa.Column('management_reachable', sa.Boolean(), nullable=False),
            sa.Column('wan_reachable', sa.Boolean(), nullable=True),
        )

    if 'client_devices' not in tables:
        op.create_table(
            'client_devices',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('mac_address', sa.String(17), nullable=False, index=True),
            sa.Column('customer_phone', sa.String(20), nullable=True),
            sa.Column('last_router_id', UUID(as_uuid=True), sa.ForeignKey('mikrotik_configs.id', ondelete='SET NULL'), nullable=True),
            sa.Column('last_ip', sa.String(45), nullable=True),
            sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('plan_expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('status', sa.String(20), nullable=False, server_default='active'),
            sa.UniqueConstraint('tenant_id', 'mac_address', name='uq_client_device_tenant_mac'),
        )


def downgrade() -> None:
    op.drop_table('client_devices')
    op.drop_table('router_health_checks')
    op.drop_table('outage_events')
