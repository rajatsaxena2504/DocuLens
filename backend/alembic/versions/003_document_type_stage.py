"""Add stage_id to document_types

Revision ID: 003
Revises: 002
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add stage_id column to document_types table
    op.add_column(
        'document_types',
        sa.Column('stage_id', sa.String(36), sa.ForeignKey('sdlc_stages.id'), nullable=True)
    )

    # Create index for faster stage-based queries
    op.create_index('ix_document_types_stage_id', 'document_types', ['stage_id'])


def downgrade() -> None:
    op.drop_index('ix_document_types_stage_id', table_name='document_types')
    op.drop_column('document_types', 'stage_id')
