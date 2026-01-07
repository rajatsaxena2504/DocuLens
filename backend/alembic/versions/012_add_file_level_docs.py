"""Add file-level documentation support

Revision ID: 012
Revises: 011
Create Date: 2026-01-08
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if columns already exist (for SQLite compatibility)
    conn = op.get_bind()
    result = conn.execute(sa.text("PRAGMA table_info(documents)"))
    existing_columns = {row[1] for row in result.fetchall()}

    with op.batch_alter_table('documents') as batch_op:
        if 'file_path' not in existing_columns:
            batch_op.add_column(sa.Column('file_path', sa.String(500), nullable=True))
        if 'is_file_level' not in existing_columns:
            batch_op.add_column(sa.Column('is_file_level', sa.Boolean, server_default='0', nullable=False))
        if 'file_type' not in existing_columns:
            batch_op.add_column(sa.Column('file_type', sa.String(20), nullable=True))
        if 'file_analysis' not in existing_columns:
            batch_op.add_column(sa.Column('file_analysis', sa.Text, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('documents') as batch_op:
        batch_op.drop_column('file_analysis')
        batch_op.drop_column('file_type')
        batch_op.drop_column('is_file_level')
        batch_op.drop_column('file_path')
