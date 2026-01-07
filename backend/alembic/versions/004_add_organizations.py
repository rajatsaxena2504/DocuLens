"""Add organizations and organization members tables

Revision ID: 004
Revises: 003
Create Date: 2026-01-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import JSON

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def get_uuid_type():
    """Return UUID type appropriate for current dialect."""
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        return postgresql.UUID(as_uuid=True)
    else:
        return sa.String(36)


def get_json_type():
    """Return JSON type appropriate for current dialect."""
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        return postgresql.JSONB()
    else:
        return JSON()


def upgrade() -> None:
    uuid_type = get_uuid_type()
    json_type = get_json_type()

    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('settings', json_type, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create organization_members table
    op.create_table(
        'organization_members',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('organization_id', uuid_type,
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type,
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='viewer'),
        sa.Column('invited_by', uuid_type,
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('organization_id', 'user_id', name='uq_org_user'),
    )

    # Create indexes
    op.create_index('ix_organizations_slug', 'organizations', ['slug'])
    op.create_index('ix_organization_members_org_id', 'organization_members', ['organization_id'])
    op.create_index('ix_organization_members_user_id', 'organization_members', ['user_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_organization_members_user_id', 'organization_members')
    op.drop_index('ix_organization_members_org_id', 'organization_members')
    op.drop_index('ix_organizations_slug', 'organizations')

    # Drop tables (order matters due to foreign keys)
    op.drop_table('organization_members')
    op.drop_table('organizations')
