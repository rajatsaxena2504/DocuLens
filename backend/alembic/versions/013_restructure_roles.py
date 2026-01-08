"""Restructure role system with additive roles and superadmin

Revision ID: 013
Revises: 012
Create Date: 2026-01-08

Changes:
- Add is_superadmin boolean to users table
- Add boolean role columns to organization_members (is_owner, is_editor, is_reviewer, is_viewer)
- Migrate existing single role data to boolean flags
- Set first user as superadmin
"""

from alembic import op
import sqlalchemy as sa


revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add is_superadmin to users table
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(
            sa.Column('is_superadmin', sa.Boolean(), server_default='0', nullable=False)
        )

    # 2. Add boolean role columns to organization_members
    with op.batch_alter_table('organization_members') as batch_op:
        batch_op.add_column(
            sa.Column('is_owner', sa.Boolean(), server_default='0', nullable=False)
        )
        batch_op.add_column(
            sa.Column('is_editor', sa.Boolean(), server_default='0', nullable=False)
        )
        batch_op.add_column(
            sa.Column('is_reviewer', sa.Boolean(), server_default='0', nullable=False)
        )
        batch_op.add_column(
            sa.Column('is_viewer', sa.Boolean(), server_default='1', nullable=False)
        )

    # 3. Migrate existing role data to boolean flags
    conn = op.get_bind()

    # Owner (formerly admin) users get all roles (backwards compatible - owner can do everything)
    conn.execute(sa.text("""
        UPDATE organization_members
        SET is_owner = 1, is_editor = 1, is_reviewer = 1, is_viewer = 1
        WHERE role = 'admin' OR role = 'owner'
    """))

    # Editor users get editor, reviewer, and viewer roles
    conn.execute(sa.text("""
        UPDATE organization_members
        SET is_editor = 1, is_reviewer = 1, is_viewer = 1
        WHERE role = 'editor'
    """))

    # Viewer users only get viewer role (already default)
    conn.execute(sa.text("""
        UPDATE organization_members
        SET is_viewer = 1
        WHERE role = 'viewer'
    """))

    # 4. Set first user as superadmin (if any users exist)
    conn.execute(sa.text("""
        UPDATE users
        SET is_superadmin = 1
        WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
    """))

    # Note: Keep the old 'role' column for now for backwards compatibility
    # It can be removed in a future migration after verifying everything works


def downgrade() -> None:
    # Remove the new columns
    with op.batch_alter_table('organization_members') as batch_op:
        batch_op.drop_column('is_viewer')
        batch_op.drop_column('is_reviewer')
        batch_op.drop_column('is_editor')
        batch_op.drop_column('is_owner')

    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_superadmin')
