"""Add isp_invites table and onboarding_complete to admin_users

Revision ID: 003_add_invites
Revises: 002_initial
Create Date: 2026-05-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_invites'
down_revision = '002_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add onboarding_complete to admin_users
    op.add_column('admin_users', 
        sa.Column('onboarding_complete', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Create isp_invites table
    op.create_table('isp_invites',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(64), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'used', 'expired', name='invite_status'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['admin_users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    
    op.create_index(op.f('ix_isp_invites_token'), 'isp_invites', ['token'], unique=True)
    op.create_index(op.f('ix_isp_invites_status'), 'isp_invites', ['status'])
    op.create_index(op.f('ix_isp_invites_created_by'), 'isp_invites', ['created_by'])
    op.create_index(op.f('ix_isp_invites_expires_at'), 'isp_invites', ['expires_at'])


def downgrade() -> None:
    op.drop_index(op.f('ix_isp_invites_expires_at'), table_name='isp_invites')
    op.drop_index(op.f('ix_isp_invites_created_by'), table_name='isp_invites')
    op.drop_index(op.f('ix_isp_invites_status'), table_name='isp_invites')
    op.drop_index(op.f('ix_isp_invites_token'), table_name='isp_invites')
    op.drop_table('isp_invites')
    op.drop_column('admin_users', 'onboarding_complete')
