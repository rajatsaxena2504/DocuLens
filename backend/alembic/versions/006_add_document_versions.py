"""Add document versions table

Revision ID: 006
Revises: 005
Create Date: 2026-01-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
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
        return postgresql.JSONB
    else:
        return sa.JSON


def upgrade() -> None:
    uuid_type = get_uuid_type()
    json_type = get_json_type()
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # Create document_versions table
    op.create_table(
        'document_versions',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('document_id', uuid_type, sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('snapshot', json_type(), nullable=False),
        sa.Column('change_summary', sa.String(500), nullable=True),
        sa.Column('created_by', uuid_type, sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('document_id', 'version_number', name='uq_document_version_number'),
    )

    # Create indexes
    op.create_index('ix_document_versions_document_id', 'document_versions', ['document_id'])
    op.create_index('ix_document_versions_created_at', 'document_versions', ['created_at'])

    # Add current_version to documents table
    op.add_column('documents', sa.Column('current_version', sa.Integer(), nullable=True, server_default='1'))

    # Add modified_by and modified_at to generated_content
    op.add_column('generated_content', sa.Column('modified_by', uuid_type, nullable=True))
    op.add_column('generated_content', sa.Column('modified_at', sa.DateTime(), nullable=True))

    # Add foreign key for modified_by if not SQLite
    if not is_sqlite:
        op.create_foreign_key(
            'fk_generated_content_modified_by',
            'generated_content',
            'users',
            ['modified_by'],
            ['id'],
            ondelete='SET NULL'
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # Remove foreign key for modified_by if not SQLite
    if not is_sqlite:
        op.drop_constraint('fk_generated_content_modified_by', 'generated_content', type_='foreignkey')

    # Remove columns from generated_content
    op.drop_column('generated_content', 'modified_at')
    op.drop_column('generated_content', 'modified_by')

    # Remove current_version from documents
    op.drop_column('documents', 'current_version')

    # Drop indexes
    op.drop_index('ix_document_versions_created_at', 'document_versions')
    op.drop_index('ix_document_versions_document_id', 'document_versions')

    # Drop document_versions table
    op.drop_table('document_versions')
