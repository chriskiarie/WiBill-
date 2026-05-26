"""Add InviteToken model and status field to Tenant (FIXED)

Revision ID: 5a510c6964e6
Revises: f35e47d8c40f
Create Date: 2026-05-24 21:50:25.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5a510c6964e6'
down_revision = 'f35e47d8c40f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the invite_tokens table
    op.create_table(
        'invite_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invite_tokens_token'), 'invite_tokens', ['token'], unique=True)
    op.create_index(op.f('ix_invite_tokens_email'), 'invite_tokens', ['email'], unique=False)

    # Update tenants table
    # Step 1: Add status column with default value (allows existing nulls temporarily)
    op.add_column('tenants', sa.Column('status', sa.String(50), server_default='pending_approval', nullable=True))
    
    # Step 2: Update existing rows to have 'active' status
    op.execute("UPDATE tenants SET status = 'active' WHERE status IS NULL")
    
    # Step 3: Now make the column NOT NULL
    op.alter_column('tenants', 'status', nullable=False, server_default=None)
    
    # Step 4: Add currency column
    op.add_column('tenants', sa.Column('currency', sa.String(3), server_default='KES', nullable=False))
    
    # Step 5: Modify existing columns
    op.alter_column('tenants', 'slug',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.String(length=100),
               existing_nullable=False)
    op.alter_column('tenants', 'name',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.String(length=200),
               existing_nullable=False)
    op.alter_column('tenants', 'commission_rate',
               existing_type=sa.NUMERIC(precision=4, scale=3),
               type_=sa.Numeric(precision=5, scale=2),
               existing_nullable=False)
    
    # Step 6: Remove the pending_approval column if it exists
    try:
        op.drop_column('tenants', 'pending_approval')
    except Exception:
        pass  # Column might not exist


def downgrade() -> None:
    # Reverse the changes
    op.drop_index(op.f('ix_invite_tokens_email'), table_name='invite_tokens')
    op.drop_index(op.f('ix_invite_tokens_token'), table_name='invite_tokens')
    op.drop_table('invite_tokens')
    
    op.drop_column('tenants', 'currency')
    op.drop_column('tenants', 'status')
    
    op.alter_column('tenants', 'commission_rate',
               existing_type=sa.Numeric(precision=5, scale=2),
               type_=sa.NUMERIC(precision=4, scale=3),
               existing_nullable=False)
    op.alter_column('tenants', 'name',
               existing_type=sa.String(length=200),
               type_=sa.VARCHAR(length=100),
               existing_nullable=False)
    op.alter_column('tenants', 'slug',
               existing_type=sa.String(length=100),
               type_=sa.VARCHAR(length=100),
               existing_nullable=False)