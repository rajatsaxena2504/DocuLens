"""Add project members table for multi-user collaboration

Revision ID: 007
Revises: 006
Create Date: 2026-01-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def get_uuid_type():
    """Return UUID type appropriate for current dialect."""
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        return postgresql.UUID(as_uuid=True)
    else:
        return sa.String(36)


def upgrade() -> None:
    uuid_type = get_uuid_type()
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # Create project_members table
    op.create_table(
        'project_members',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('sdlc_project_id', uuid_type, sa.ForeignKey('sdlc_projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),  # 'owner', 'editor', 'viewer'
        sa.Column('added_by', uuid_type, sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('added_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('sdlc_project_id', 'user_id', name='uq_project_member'),
    )

    # Create indexes
    op.create_index('ix_project_members_project_id', 'project_members', ['sdlc_project_id'])
    op.create_index('ix_project_members_user_id', 'project_members', ['user_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_project_members_user_id', 'project_members')
    op.drop_index('ix_project_members_project_id', 'project_members')

    # Drop table
    op.drop_table('project_members')
