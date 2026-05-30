"""add mpesa_transactions payout_accounts tenant_lock_fields

Revision ID: 70fa724590f1
Revises: 4b_invoice_system_001
Create Date: 2026-05-29 23:06:00.156492

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '70fa724590f1'
down_revision: Union[str, None] = '4b_invoice_system_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('payout_accounts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('owner_type', sa.Enum('platform', 'isp', name='payoutaccountowner', native_enum=False), nullable=False),
    sa.Column('owner_id', sa.UUID(), nullable=True),
    sa.Column('account_name', sa.String(length=200), nullable=False),
    sa.Column('phone_number', sa.String(length=20), nullable=False),
    sa.Column('account_holder_name', sa.String(length=200), nullable=False),
    sa.Column('account_type', sa.Enum('personal', 'business', 'paybill', name='payoutaccounttype', native_enum=False), nullable=False),
    sa.Column('is_default', sa.Boolean(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('status', sa.Enum('pending', 'verified', 'inactive', 'blocked', name='payoutaccountstatus', native_enum=False), nullable=False),
    sa.Column('is_verified', sa.Boolean(), nullable=False),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('verified_by', sa.UUID(), nullable=True),
    sa.Column('daily_limit_ksh', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('month_payout_amount_ksh', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('updated_by', sa.UUID(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payout_accounts_owner_id'), 'payout_accounts', ['owner_id'], unique=False)
    op.create_index(op.f('ix_payout_accounts_owner_type'), 'payout_accounts', ['owner_type'], unique=False)
    op.create_index(op.f('ix_payout_accounts_phone_number'), 'payout_accounts', ['phone_number'], unique=True)
    op.create_index(op.f('ix_payout_accounts_status'), 'payout_accounts', ['status'], unique=False)
    op.create_table('mpesa_transactions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.UUID(), nullable=False),
    sa.Column('mpesa_config_id', sa.UUID(), nullable=False),
    sa.Column('amount_ksh', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('phone_number', sa.String(length=20), nullable=False),
    sa.Column('payment_type', sa.Enum('session', 'invoice', 'topup', 'refund', name='mpesatransactiontype', native_enum=False), nullable=False),
    sa.Column('reference_id', sa.UUID(), nullable=True),
    sa.Column('merchant_request_id', sa.String(length=100), nullable=True),
    sa.Column('checkout_request_id', sa.String(length=100), nullable=True),
    sa.Column('response_code', sa.String(length=10), nullable=True),
    sa.Column('response_description', sa.String(length=500), nullable=True),
    sa.Column('status', sa.Enum('pending', 'processing', 'success', 'failed', 'cancelled', 'expired', 'reversed', name='mpesatransactionstatus', native_enum=False), nullable=False),
    sa.Column('result_code', sa.String(length=10), nullable=True),
    sa.Column('result_description', sa.String(length=500), nullable=True),
    sa.Column('transaction_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('mpesa_receipt_number', sa.String(length=50), nullable=True),
    sa.Column('balance_ksh', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('error_reason', sa.String(length=500), nullable=True),
    sa.Column('is_retry', sa.Boolean(), nullable=False),
    sa.Column('retry_count', sa.Integer(), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_processed', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['mpesa_config_id'], ['mpesa_configs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_mpesa_tx_reference', 'mpesa_transactions', ['reference_id', 'payment_type'], unique=False)
    op.create_index('idx_mpesa_tx_tenant_date', 'mpesa_transactions', ['tenant_id', 'created_at'], unique=False)
    op.create_index('idx_mpesa_tx_tenant_type_status', 'mpesa_transactions', ['tenant_id', 'payment_type', 'status'], unique=False)
    op.create_index(op.f('ix_mpesa_transactions_checkout_request_id'), 'mpesa_transactions', ['checkout_request_id'], unique=True)
    op.create_index(op.f('ix_mpesa_transactions_merchant_request_id'), 'mpesa_transactions', ['merchant_request_id'], unique=False)
    op.create_index(op.f('ix_mpesa_transactions_mpesa_receipt_number'), 'mpesa_transactions', ['mpesa_receipt_number'], unique=True)
    op.create_index(op.f('ix_mpesa_transactions_payment_type'), 'mpesa_transactions', ['payment_type'], unique=False)
    op.create_index(op.f('ix_mpesa_transactions_reference_id'), 'mpesa_transactions', ['reference_id'], unique=False)
    op.create_index(op.f('ix_mpesa_transactions_status'), 'mpesa_transactions', ['status'], unique=False)
    op.create_index(op.f('ix_mpesa_transactions_tenant_id'), 'mpesa_transactions', ['tenant_id'], unique=False)
    op.add_column('mpesa_configs', sa.Column('payout_phone', sa.String(length=20), nullable=True))
    op.add_column('mpesa_configs', sa.Column('payout_account_name', sa.String(length=200), nullable=True))
    op.add_column('mpesa_configs', sa.Column('account_reference', sa.String(length=100), nullable=True))
    op.add_column('mpesa_configs', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('mpesa_configs', sa.Column('last_test_status', sa.String(length=500), nullable=True))
    op.add_column('mpesa_configs', sa.Column('last_test_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('mpesa_configs', sa.Column('min_transaction_amount', sa.Float(), nullable=True))
    op.execute("UPDATE mpesa_configs SET min_transaction_amount = 1.0 WHERE min_transaction_amount IS NULL")
    op.alter_column('mpesa_configs', 'min_transaction_amount', nullable=False)
    op.add_column('mpesa_configs', sa.Column('max_daily_transaction_amount', sa.Float(), nullable=True))
    op.execute("UPDATE mpesa_configs SET max_daily_transaction_amount = 300000.0 WHERE max_daily_transaction_amount IS NULL")
    op.alter_column('mpesa_configs', 'max_daily_transaction_amount', nullable=False)
    op.add_column('mpesa_configs', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.execute("UPDATE mpesa_configs SET is_active = false WHERE is_active IS NULL")
    op.alter_column('mpesa_configs', 'is_active', nullable=False)
    op.add_column('mpesa_configs', sa.Column('is_verified', sa.Boolean(), nullable=True))
    op.execute("UPDATE mpesa_configs SET is_verified = false WHERE is_verified IS NULL")
    op.alter_column('mpesa_configs', 'is_verified', nullable=False)
    op.add_column('mpesa_configs', sa.Column('status', sa.String(length=50), nullable=True))
    op.execute("UPDATE mpesa_configs SET status = 'not_configured' WHERE status IS NULL")
    op.alter_column('mpesa_configs', 'status', nullable=False)
    op.alter_column('mpesa_configs', 'environment',
               existing_type=postgresql.ENUM('SANDBOX', 'PRODUCTION', name='darajaenvironment'),
               type_=sa.String(length=20),
               existing_nullable=False)
    op.execute("UPDATE mpesa_configs SET environment = lower(environment)")
    op.alter_column('tenants', 'locked_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('tenants', 'locked_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.drop_column('mpesa_configs', 'last_test_at')
    op.drop_column('mpesa_configs', 'last_test_status')
    op.drop_column('mpesa_configs', 'verified_at')
    op.drop_column('mpesa_configs', 'is_verified')
    op.drop_column('mpesa_configs', 'is_active')
    op.drop_column('mpesa_configs', 'status')
    op.drop_column('mpesa_configs', 'max_daily_transaction_amount')
    op.drop_column('mpesa_configs', 'min_transaction_amount')
    op.drop_column('mpesa_configs', 'account_reference')
    op.drop_column('mpesa_configs', 'payout_account_name')
    op.drop_column('mpesa_configs', 'payout_phone')
    op.drop_index(op.f('ix_mpesa_transactions_tenant_id'), table_name='mpesa_transactions')
    op.drop_index(op.f('ix_mpesa_transactions_status'), table_name='mpesa_transactions')
    op.drop_index(op.f('ix_mpesa_transactions_reference_id'), table_name='mpesa_transactions')
    op.drop_index(op.f('ix_mpesa_transactions_payment_type'), table_name='mpesa_transactions')
    op.drop_index(op.f('ix_mpesa_transactions_mpesa_receipt_number'), table_name='mpesa_transactions')
    op.drop_index(op.f('ix_mpesa_transactions_merchant_request_id'), table_name='mpesa_transactions')
    op.drop_index(op.f('ix_mpesa_transactions_checkout_request_id'), table_name='mpesa_transactions')
    op.drop_index('idx_mpesa_tx_tenant_type_status', table_name='mpesa_transactions')
    op.drop_index('idx_mpesa_tx_tenant_date', table_name='mpesa_transactions')
    op.drop_index('idx_mpesa_tx_reference', table_name='mpesa_transactions')
    op.drop_table('mpesa_transactions')
    op.drop_index(op.f('ix_payout_accounts_status'), table_name='payout_accounts')
    op.drop_index(op.f('ix_payout_accounts_phone_number'), table_name='payout_accounts')
    op.drop_index(op.f('ix_payout_accounts_owner_type'), table_name='payout_accounts')
    op.drop_index(op.f('ix_payout_accounts_owner_id'), table_name='payout_accounts')
    op.drop_table('payout_accounts')
