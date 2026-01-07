"""Add multi-tenant fields to existing tables

Revision ID: 005
Revises: 004
Create Date: 2026-01-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def get_uuid_type():
    """Return UUID type appropriate for current dialect."""
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        return postgresql.UUID(as_uuid=True)
    else:
        return sa.String(36)


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    uuid_type = get_uuid_type()
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # Add new columns to users table (skip if already exists)
    if not column_exists('users', 'is_active'):
        op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'))
    if not column_exists('users', 'email_verified'):
        op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=True, server_default='0'))
    if not column_exists('users', 'last_login'):
        op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))

    # Update existing rows to have default values
    op.execute("UPDATE users SET is_active = 1 WHERE is_active IS NULL")
    op.execute("UPDATE users SET email_verified = 0 WHERE email_verified IS NULL")

    if is_sqlite:
        # SQLite: Add columns without foreign key constraints (SQLite ignores them anyway)
        op.add_column('sdlc_projects', sa.Column('organization_id', uuid_type, nullable=True))
        op.add_column('document_types', sa.Column('organization_id', uuid_type, nullable=True))
        op.add_column('document_types', sa.Column('is_org_default', sa.Boolean(), nullable=True, server_default='0'))
        op.add_column('sections', sa.Column('organization_id', uuid_type, nullable=True))
    else:
        # PostgreSQL: Add columns with proper foreign key constraints
        op.add_column('sdlc_projects', sa.Column('organization_id', uuid_type,
                      sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True))
        op.alter_column('sdlc_projects', 'user_id', nullable=True)

        op.add_column('document_types', sa.Column('organization_id', uuid_type,
                      sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True))
        op.add_column('document_types', sa.Column('is_org_default', sa.Boolean(), nullable=True, server_default='0'))

        op.add_column('sections', sa.Column('organization_id', uuid_type,
                      sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True))

    # Create indexes for new foreign keys
    op.create_index('ix_sdlc_projects_org_id', 'sdlc_projects', ['organization_id'])
    op.create_index('ix_document_types_org_id', 'document_types', ['organization_id'])
    op.create_index('ix_sections_org_id', 'sections', ['organization_id'])


def downgrade() -> None:
    bind = op.get_bind()

    # Drop indexes
    op.drop_index('ix_sections_org_id', 'sections')
    op.drop_index('ix_document_types_org_id', 'document_types')
    op.drop_index('ix_sdlc_projects_org_id', 'sdlc_projects')

    # Remove columns from sections
    op.drop_column('sections', 'organization_id')

    # Remove columns from document_types
    op.drop_column('document_types', 'is_org_default')
    op.drop_column('document_types', 'organization_id')

    # Remove organization_id from sdlc_projects
    op.drop_column('sdlc_projects', 'organization_id')

    # Make user_id non-nullable again in sdlc_projects (PostgreSQL only)
    if bind.dialect.name == 'postgresql':
        op.alter_column('sdlc_projects', 'user_id', nullable=False)

    # Remove columns from users
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'is_active')
