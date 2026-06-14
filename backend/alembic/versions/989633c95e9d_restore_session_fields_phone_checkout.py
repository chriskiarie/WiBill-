"""restore session fields phone checkout

Revision ID: 989633c95e9d
Revises: c1d2e3f4a5b6
Create Date: 2026-06-07 00:45:08.973501

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '989633c95e9d'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

old_invoicestatus = sa.Enum('draft', 'sent', 'due', 'overdue', 'paid', 'cancelled', name='invoicestatus')
old_daraja_env = sa.Enum('sandbox', 'production', name='darajaenvironment')
old_mpesa_status = sa.Enum('not_configured', 'configured', 'verified', 'failed', 'disabled', name='mpesaconfigstatus')
old_txn_status = sa.Enum('pending', 'success', 'failed', name='transactionstatus')

new_invoicestatus = sa.Enum('draft', 'sent', 'due', 'overdue', 'paid', 'cancelled', name='invoicestatus')
new_daraja_env = sa.Enum('sandbox', 'production', name='darajaenvironment')
new_mpesa_status = sa.Enum('not_configured', 'configured', 'verified', 'failed', 'disabled', name='mpesaconfigstatus')
new_txn_status = sa.Enum('pending', 'success', 'failed', name='transactionstatus')


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Create enums if they don't exist
    enum_names = [e['name'] for e in inspector.get_enums()]
    if 'invoicestatus' not in enum_names:
        old_invoicestatus.create(conn)
    if 'darajaenvironment' not in enum_names:
        old_daraja_env.create(conn)
    if 'mpesaconfigstatus' not in enum_names:
        old_mpesa_status.create(conn)
    if 'transactionstatus' not in enum_names:
        old_txn_status.create(conn)

    # Add unique constraint on vouchers if not exists
    from sqlalchemy import inspect as sa_inspect
    constraint_names = [c['name'] for c in sa_inspect(conn).get_unique_constraints('vouchers')]
    if 'vouchers_code_key' not in constraint_names:
        op.create_unique_constraint('vouchers_code_key', 'vouchers', ['code'])

    # Recreate indexes if missing
    existing_indexes = [i['name'] for i in inspector.get_indexes('invoices')]
    if 'ix_invoices_status' not in existing_indexes:
        op.create_index('ix_invoices_status', 'invoices', ['status'])
    if 'ix_invoices_due_date' not in existing_indexes:
        op.create_index('ix_invoices_due_date', 'invoices', ['due_date'])
    if 'ix_invoices_tenant_id' not in existing_indexes:
        op.create_index('ix_invoices_tenant_id', 'invoices', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_invoices_tenant_id', table_name='invoices')
    op.drop_index('ix_invoices_due_date', table_name='invoices')
    op.drop_index('ix_invoices_status', table_name='invoices')
    op.drop_constraint('vouchers_code_key', 'vouchers')
    old_txn_status.drop()
    old_mpesa_status.drop()
    old_daraja_env.drop()
    old_invoicestatus.drop()
