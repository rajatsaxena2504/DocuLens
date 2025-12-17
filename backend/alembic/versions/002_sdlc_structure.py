"""Add SDLC project structure

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 00:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Predefined SDLC stages
SDLC_STAGES = [
    {
        'id': uuid.UUID('10000000-0000-0000-0000-000000000001'),
        'name': 'Requirements',
        'description': 'Business and functional requirements documentation',
        'display_order': 1,
        'icon': 'clipboard-list',
        'color': 'violet',
    },
    {
        'id': uuid.UUID('10000000-0000-0000-0000-000000000002'),
        'name': 'Design',
        'description': 'System and software design documentation',
        'display_order': 2,
        'icon': 'drafting-compass',
        'color': 'blue',
    },
    {
        'id': uuid.UUID('10000000-0000-0000-0000-000000000003'),
        'name': 'Development',
        'description': 'Development guides and API documentation',
        'display_order': 3,
        'icon': 'code',
        'color': 'emerald',
    },
    {
        'id': uuid.UUID('10000000-0000-0000-0000-000000000004'),
        'name': 'Testing',
        'description': 'Test plans and quality assurance documentation',
        'display_order': 4,
        'icon': 'flask-conical',
        'color': 'amber',
    },
    {
        'id': uuid.UUID('10000000-0000-0000-0000-000000000005'),
        'name': 'Deployment',
        'description': 'Deployment guides and release documentation',
        'display_order': 5,
        'icon': 'rocket',
        'color': 'rose',
    },
    {
        'id': uuid.UUID('10000000-0000-0000-0000-000000000006'),
        'name': 'Maintenance',
        'description': 'Operations and maintenance documentation',
        'display_order': 6,
        'icon': 'wrench',
        'color': 'slate',
    },
]


def upgrade() -> None:
    # Create SDLC stages table
    op.create_table(
        'sdlc_stages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text()),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('icon', sa.String(50)),
        sa.Column('color', sa.String(50)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create SDLC projects table (top-level project container)
    op.create_table(
        'sdlc_projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('status', sa.String(50), server_default='active'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Add sdlc_project_id to existing projects table (links repo to SDLC project)
    op.add_column(
        'projects',
        sa.Column('sdlc_project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sdlc_projects.id', ondelete='SET NULL'), nullable=True)
    )

    # Add repo_type to projects table (frontend, backend, etc.)
    op.add_column(
        'projects',
        sa.Column('repo_type', sa.String(50), nullable=True)
    )

    # Add stage_id to documents table (categorizes document by SDLC stage)
    op.add_column(
        'documents',
        sa.Column('stage_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sdlc_stages.id'), nullable=True)
    )

    # Seed SDLC stages
    sdlc_stages_table = sa.table(
        'sdlc_stages',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('name', sa.String),
        sa.column('description', sa.Text),
        sa.column('display_order', sa.Integer),
        sa.column('icon', sa.String),
        sa.column('color', sa.String),
    )

    op.bulk_insert(sdlc_stages_table, SDLC_STAGES)

    # Create indexes
    op.create_index('ix_sdlc_projects_user_id', 'sdlc_projects', ['user_id'])
    op.create_index('ix_projects_sdlc_project_id', 'projects', ['sdlc_project_id'])
    op.create_index('ix_documents_stage_id', 'documents', ['stage_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_documents_stage_id', 'documents')
    op.drop_index('ix_projects_sdlc_project_id', 'projects')
    op.drop_index('ix_sdlc_projects_user_id', 'sdlc_projects')

    # Remove columns
    op.drop_column('documents', 'stage_id')
    op.drop_column('projects', 'repo_type')
    op.drop_column('projects', 'sdlc_project_id')

    # Drop tables
    op.drop_table('sdlc_projects')
    op.drop_table('sdlc_stages')
