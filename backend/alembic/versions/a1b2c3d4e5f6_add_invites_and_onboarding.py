"""add isp_invites table and onboarding fields

Revision ID: a1b2c3d4e5f6
Revises: 585ffe3c1ef7
Create Date: 2026-05-18

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '585ffe3c1ef7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Type Only If Missing ────────────────────────────────
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitestatus') THEN
                CREATE TYPE invitestatus AS ENUM ('pending', 'used', 'expired');
            END IF;
        END 
        $$;
    """)

    # ── 2. Create isp_invites table ───────────────────────────────────
    op.create_table(
        'isp_invites',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('token', sa.String(64), nullable=False, unique=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_users.id'), nullable=False),
        
        # FIX: We leave server_default off here so Postgres doesn't lock a string-default expression
        sa.Column('status', sa.String(20), nullable=False),
        
        sa.Column('note', sa.String(200), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('used_by_tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_isp_invites_token', 'isp_invites', ['token'])
    op.create_index('ix_isp_invites_status', 'isp_invites', ['status'])

    # Safely switch the column type to the true database enum on disk
    op.execute("ALTER TABLE isp_invites ALTER COLUMN status TYPE invitestatus USING status::invitestatus;")
    
    # Now that it's an enum type, safely apply the server default directly to it
    op.execute("ALTER TABLE isp_invites ALTER COLUMN status SET DEFAULT 'pending'::invitestatus;")

    # ── 3. Add pending_approval to tenants ────────────────────────────
    op.add_column('tenants', sa.Column(
        'pending_approval',
        sa.Boolean(),
        nullable=False,
        server_default='false'
    ))

    # ── 4. Add onboarding_complete to admin_users ─────────────────────
    op.add_column('admin_users', sa.Column(
        'onboarding_complete',
        sa.Boolean(),
        nullable=False,
        server_default='false'
    ))


def downgrade() -> None:
    op.drop_column('admin_users', 'onboarding_complete')
    op.drop_column('tenants', 'pending_approval')
    op.drop_index('ix_isp_invites_status', table_name='isp_invites')
    op.drop_index('ix_isp_invites_token', table_name='isp_invites')
    op.drop_table('isp_invites')
    
    op.execute('DROP TYPE IF EXISTS invitestatus CASCADE;')