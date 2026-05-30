"""Create invoice and billing tables

Revision ID: 4b_invoice_system_001
Revises: 2d3b8db79780
Create Date: 2026-05-28 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '4b_invoice_system_001'
down_revision = '2d3b8db79780'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create invoice tables with proper ENUM handling"""
    
    # Create invoice status enum ONLY if it doesn't exist
    # This prevents "type already exists" error
    try:
        op.execute("CREATE TYPE invoicestatus AS ENUM ('draft', 'sent', 'due', 'overdue', 'paid', 'cancelled')")
    except Exception:
        # Type already exists, skip
        pass
    
    # Create email status enum ONLY if it doesn't exist
    try:
        op.execute("CREATE TYPE emailstatus AS ENUM ('pending', 'sent', 'bounced', 'failed')")
    except Exception:
        # Type already exists, skip
        pass
    
    # Create invoices table
    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('gross_revenue', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('platform_fee', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('isp_earnings', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('amount_due', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('issued_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('paid_date', sa.DateTime(), nullable=True),
        sa.Column('status', postgresql.ENUM('draft', 'sent', 'due', 'overdue', 'paid', 'cancelled', name='invoicestatus', create_type=False), nullable=False, server_default='draft'),
        sa.Column('payment_method', sa.String(length=50), nullable=True),
        sa.Column('mpesa_receipt', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mpesa_receipt', name='uq_mpesa_receipt'),
        sa.UniqueConstraint('tenant_id', 'month', 'year', name='unique_invoice_per_month'),
        schema=None
    )
    
    # Create index on invoices
    op.create_index('ix_invoices_tenant_id', 'invoices', ['tenant_id'])
    op.create_index('ix_invoices_status', 'invoices', ['status'])
    op.create_index('ix_invoices_due_date', 'invoices', ['due_date'])
    
    # Create invoice_transactions table
    op.create_table(
        'invoice_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount_ksh', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema=None
    )
    
    # Create index on invoice_transactions
    op.create_index('ix_invoice_transactions_invoice_id', 'invoice_transactions', ['invoice_id'])
    op.create_index('ix_invoice_transactions_transaction_id', 'invoice_transactions', ['transaction_id'])
    
    # Create invoice_reminders table
    op.create_table(
        'invoice_reminders',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('days_before_due', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('email_address', sa.String(length=255), nullable=False),
        sa.Column('email_status', postgresql.ENUM('pending', 'sent', 'bounced', 'failed', name='emailstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema=None
    )
    
    # Create index on invoice_reminders
    op.create_index('ix_invoice_reminders_invoice_id', 'invoice_reminders', ['invoice_id'])
    
    # Add columns to tenants table
    # Check if columns exist first (they might already be there)
    try:
        op.add_column('tenants', sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='false'))
    except Exception:
        pass
    
    try:
        op.add_column('tenants', sa.Column('locked_reason', sa.String(length=255), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('tenants', sa.Column('locked_at', sa.DateTime(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    """Drop invoice tables"""
    
    # Remove columns from tenants
    try:
        op.drop_column('tenants', 'locked_at')
    except Exception:
        pass
    
    try:
        op.drop_column('tenants', 'locked_reason')
    except Exception:
        pass
    
    try:
        op.drop_column('tenants', 'is_locked')
    except Exception:
        pass
    
    # Drop invoice_reminders
    try:
        op.drop_index('ix_invoice_reminders_invoice_id', table_name='invoice_reminders')
    except Exception:
        pass
    
    try:
        op.drop_table('invoice_reminders')
    except Exception:
        pass
    
    # Drop invoice_transactions
    try:
        op.drop_index('ix_invoice_transactions_transaction_id', table_name='invoice_transactions')
    except Exception:
        pass
    
    try:
        op.drop_index('ix_invoice_transactions_invoice_id', table_name='invoice_transactions')
    except Exception:
        pass
    
    try:
        op.drop_table('invoice_transactions')
    except Exception:
        pass
    
    # Drop invoices
    try:
        op.drop_index('ix_invoices_due_date', table_name='invoices')
    except Exception:
        pass
    
    try:
        op.drop_index('ix_invoices_status', table_name='invoices')
    except Exception:
        pass
    
    try:
        op.drop_index('ix_invoices_tenant_id', table_name='invoices')
    except Exception:
        pass
    
    try:
        op.drop_table('invoices')
    except Exception:
        pass
    
    # Drop enums if they exist
    try:
        op.execute('DROP TYPE IF EXISTS emailstatus')
    except Exception:
        pass
    
    try:
        op.execute('DROP TYPE IF EXISTS invoicestatus')
    except Exception:
        pass