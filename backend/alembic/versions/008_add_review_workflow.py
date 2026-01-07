"""Add review workflow tables

Revision ID: 008
Revises: 007
Create Date: 2026-01-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None

# Use String for SQLite compatibility
uuid_type = sa.String(36)


def upgrade() -> None:
    # Add review fields to documents table - skip if already exists (from partial migration)
    conn = op.get_bind()
    result = conn.execute(sa.text("PRAGMA table_info(documents)"))
    existing_columns = {row[1] for row in result.fetchall()}

    if 'review_status' not in existing_columns:
        with op.batch_alter_table('documents') as batch_op:
            batch_op.add_column(sa.Column('review_status', sa.String(30), server_default='draft', nullable=False))
            batch_op.add_column(sa.Column('assigned_reviewer_id', uuid_type, nullable=True))
            batch_op.add_column(sa.Column('submitted_at', sa.DateTime(), nullable=True))
            batch_op.add_column(sa.Column('approved_at', sa.DateTime(), nullable=True))

    # Create document_reviews table
    op.create_table(
        'document_reviews',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('document_id', uuid_type, sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reviewer_id', uuid_type, sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('version_number', sa.Integer(), nullable=True),  # Which version was reviewed
        sa.Column('status', sa.String(30), nullable=False),  # approved, rejected, changes_requested
        sa.Column('overall_comment', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Create indexes for document_reviews
    op.create_index('ix_document_reviews_document_id', 'document_reviews', ['document_id'])
    op.create_index('ix_document_reviews_reviewer_id', 'document_reviews', ['reviewer_id'])

    # Create review_comments table
    op.create_table(
        'review_comments',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('review_id', uuid_type, sa.ForeignKey('document_reviews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_section_id', uuid_type, sa.ForeignKey('document_sections.id', ondelete='CASCADE'), nullable=True),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('resolved_by', uuid_type, sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', uuid_type, sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Create indexes for review_comments
    op.create_index('ix_review_comments_review_id', 'review_comments', ['review_id'])
    op.create_index('ix_review_comments_section_id', 'review_comments', ['document_section_id'])


def downgrade() -> None:
    # Drop review_comments table
    op.drop_index('ix_review_comments_section_id', 'review_comments')
    op.drop_index('ix_review_comments_review_id', 'review_comments')
    op.drop_table('review_comments')

    # Drop document_reviews table
    op.drop_index('ix_document_reviews_reviewer_id', 'document_reviews')
    op.drop_index('ix_document_reviews_document_id', 'document_reviews')
    op.drop_table('document_reviews')

    # Remove review fields from documents using batch mode
    with op.batch_alter_table('documents') as batch_op:
        batch_op.drop_column('approved_at')
        batch_op.drop_column('submitted_at')
        batch_op.drop_column('assigned_reviewer_id')
        batch_op.drop_column('review_status')
