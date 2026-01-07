from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


# ============ Review Statuses ============

class ReviewStatus:
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"


class ReviewDecision:
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


# ============ Request Schemas ============

class SubmitForReviewRequest(BaseModel):
    reviewer_id: Optional[UUID] = None
    note: Optional[str] = None


class AssignReviewerRequest(BaseModel):
    reviewer_id: UUID


class ReviewCommentCreate(BaseModel):
    document_section_id: Optional[UUID] = None
    comment: str


class SubmitReviewRequest(BaseModel):
    status: str  # approved, rejected, changes_requested
    overall_comment: Optional[str] = None
    comments: Optional[List[ReviewCommentCreate]] = None


class ResolveCommentRequest(BaseModel):
    pass  # Just needs to be called, no body required


# ============ Response Schemas ============

class ReviewerInfo(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewCommentResponse(BaseModel):
    id: UUID
    review_id: UUID
    document_section_id: Optional[UUID] = None
    comment: str
    is_resolved: bool
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    creator: Optional[ReviewerInfo] = None
    section_title: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentReviewResponse(BaseModel):
    id: UUID
    document_id: UUID
    reviewer_id: Optional[UUID] = None
    version_number: Optional[int] = None
    status: str
    overall_comment: Optional[str] = None
    reviewed_at: datetime
    reviewer: Optional[ReviewerInfo] = None
    comments: List[ReviewCommentResponse] = []

    class Config:
        from_attributes = True


class DocumentReviewSummary(BaseModel):
    """Summary view without full comments."""
    id: UUID
    document_id: UUID
    reviewer_id: Optional[UUID] = None
    version_number: Optional[int] = None
    status: str
    overall_comment: Optional[str] = None
    reviewed_at: datetime
    reviewer: Optional[ReviewerInfo] = None
    comment_count: int = 0
    unresolved_count: int = 0

    class Config:
        from_attributes = True


class ReviewStatusResponse(BaseModel):
    """Current review status of a document."""
    review_status: str
    assigned_reviewer: Optional[ReviewerInfo] = None
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    latest_review: Optional[DocumentReviewSummary] = None
    total_reviews: int = 0
    pending_comments: int = 0

    class Config:
        from_attributes = True
