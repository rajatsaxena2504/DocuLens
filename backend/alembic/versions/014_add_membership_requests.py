"""Add membership_requests table for org join approval workflow

Revision ID: 014
Revises: 013
Create Date: 2026-01-08

Changes:
- Create membership_requests table for tracking org join requests
- Allows users to request to join an organization
- Owners and superadmins can approve/reject requests
"""

from alembic import op
import sqlalchemy as sa


revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'membership_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('requested_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.UniqueConstraint('organization_id', 'user_id', name='uq_membership_request'),
    )

    # Create index for efficient lookups
    op.create_index('ix_membership_requests_org_status', 'membership_requests', ['organization_id', 'status'])
    op.create_index('ix_membership_requests_user', 'membership_requests', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_membership_requests_user')
    op.drop_index('ix_membership_requests_org_status')
    op.drop_table('membership_requests')
