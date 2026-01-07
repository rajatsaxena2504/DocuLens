"""Add STTM (Source to Target Mapping) table

Revision ID: 011
Revises: 010
Create Date: 2026-01-08
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create STTM mappings table
    op.create_table(
        'sttm_mappings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),

        # Source fields
        sa.Column('source_system', sa.String(100), nullable=True),
        sa.Column('source_table', sa.String(255), nullable=True),
        sa.Column('source_column', sa.String(255), nullable=True),
        sa.Column('source_datatype', sa.String(100), nullable=True),

        # Target fields
        sa.Column('target_system', sa.String(100), nullable=True),
        sa.Column('target_table', sa.String(255), nullable=True),
        sa.Column('target_column', sa.String(255), nullable=True),
        sa.Column('target_datatype', sa.String(100), nullable=True),

        # Transformation
        sa.Column('transformation_logic', sa.Text, nullable=True),
        sa.Column('transformation_type', sa.String(50), nullable=True),  # direct, derived, constant, lookup

        # Metadata
        sa.Column('business_rule', sa.Text, nullable=True),
        sa.Column('is_key', sa.Boolean, default=False),
        sa.Column('is_nullable', sa.Boolean, default=True),
        sa.Column('default_value', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        sa.Column('display_order', sa.Integer, nullable=False, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, onupdate=sa.func.now()),
    )

    # Create index for faster lookups
    op.create_index('ix_sttm_mappings_document_id', 'sttm_mappings', ['document_id'])


def downgrade() -> None:
    op.drop_index('ix_sttm_mappings_document_id')
    op.drop_table('sttm_mappings')
