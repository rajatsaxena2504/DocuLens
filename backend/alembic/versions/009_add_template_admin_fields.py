"""Add admin template library fields

Revision ID: 009
Revises: 008
Create Date: 2026-01-08

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None

# Use String for SQLite compatibility
uuid_type = sa.String(36)


def upgrade() -> None:
    # Add admin fields to document_types table
    conn = op.get_bind()
    result = conn.execute(sa.text("PRAGMA table_info(document_types)"))
    existing_columns = {row[1] for row in result.fetchall()}

    if 'is_org_default' not in existing_columns:
        with op.batch_alter_table('document_types') as batch_op:
            batch_op.add_column(sa.Column('is_org_default', sa.Boolean(), server_default='0', nullable=False))
            batch_op.add_column(sa.Column('created_by', uuid_type, nullable=True))

    # Add same fields to sections table for completeness
    result = conn.execute(sa.text("PRAGMA table_info(sections)"))
    existing_columns = {row[1] for row in result.fetchall()}

    if 'created_by' not in existing_columns:
        with op.batch_alter_table('sections') as batch_op:
            batch_op.add_column(sa.Column('created_by', uuid_type, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('document_types') as batch_op:
        batch_op.drop_column('created_by')
        batch_op.drop_column('is_org_default')

    with op.batch_alter_table('sections') as batch_op:
        batch_op.drop_column('created_by')
