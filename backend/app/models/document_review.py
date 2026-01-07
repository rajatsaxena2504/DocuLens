import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class DocumentReview(Base):
    """Model for document reviews in the review workflow."""
    __tablename__ = "document_reviews"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID(), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    version_number = Column(Integer, nullable=True)  # Which version was reviewed
    status = Column(String(30), nullable=False)  # approved, rejected, changes_requested
    overall_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    comments = relationship("ReviewComment", back_populates="review", cascade="all, delete-orphan")


class ReviewComment(Base):
    """Model for comments on specific sections during review."""
    __tablename__ = "review_comments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    review_id = Column(GUID(), ForeignKey("document_reviews.id", ondelete="CASCADE"), nullable=False)
    document_section_id = Column(GUID(), ForeignKey("document_sections.id", ondelete="CASCADE"), nullable=True)
    comment = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    review = relationship("DocumentReview", back_populates="comments")
    section = relationship("DocumentSection")
    creator = relationship("User", foreign_keys=[created_by])
    resolver = relationship("User", foreign_keys=[resolved_by])
