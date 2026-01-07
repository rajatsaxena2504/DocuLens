"""Add connectors for external integrations

Revision ID: 010
Revises: 009
Create Date: 2026-01-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None

# Use String for SQLite compatibility
uuid_type = sa.String(36)


def upgrade() -> None:
    # Create connectors table
    op.create_table(
        'connectors',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('organization_id', uuid_type, sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(30), nullable=False),  # jira, confluence, miro, sharepoint
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('config', sa.Text(), nullable=False),  # JSON encrypted credentials
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_by', uuid_type, sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
    )

    # Create indexes for connectors
    op.create_index('ix_connectors_organization_id', 'connectors', ['organization_id'])
    op.create_index('ix_connectors_type', 'connectors', ['type'])

    # Create connector_imports table
    op.create_table(
        'connector_imports',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('connector_id', uuid_type, sa.ForeignKey('connectors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', uuid_type, sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=True),  # jira_issue, confluence_page, etc.
        sa.Column('source_id', sa.String(255), nullable=True),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('imported_content', sa.Text(), nullable=True),
        sa.Column('imported_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Create indexes for connector_imports
    op.create_index('ix_connector_imports_connector_id', 'connector_imports', ['connector_id'])
    op.create_index('ix_connector_imports_document_id', 'connector_imports', ['document_id'])


def downgrade() -> None:
    # Drop connector_imports table
    op.drop_index('ix_connector_imports_document_id', 'connector_imports')
    op.drop_index('ix_connector_imports_connector_id', 'connector_imports')
    op.drop_table('connector_imports')

    # Drop connectors table
    op.drop_index('ix_connectors_type', 'connectors')
    op.drop_index('ix_connectors_organization_id', 'connectors')
    op.drop_table('connectors')
