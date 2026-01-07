from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field


class DocumentVersionCreate(BaseModel):
    """Schema for creating a new document version (snapshot)."""
    change_summary: Optional[str] = Field(None, max_length=500)


class DocumentVersionResponse(BaseModel):
    """Response schema for a document version."""
    id: UUID
    document_id: UUID
    version_number: int
    change_summary: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    creator_name: Optional[str] = None  # Populated from relationship

    class Config:
        from_attributes = True


class DocumentVersionDetail(DocumentVersionResponse):
    """Full version details including snapshot."""
    snapshot: dict[str, Any]  # Full document state


class DocumentVersionList(BaseModel):
    """List of document versions."""
    versions: list[DocumentVersionResponse]
    total: int
    current_version: int


class VersionComparisonRequest(BaseModel):
    """Request to compare two versions."""
    from_version: int = Field(..., ge=1)
    to_version: int = Field(..., ge=1)


class SectionDiff(BaseModel):
    """Represents changes to a single section."""
    section_id: UUID
    section_title: str
    change_type: str  # "added", "removed", "modified", "unchanged"
    old_content: Optional[str] = None
    new_content: Optional[str] = None


class VersionComparisonResponse(BaseModel):
    """Response containing the diff between two versions."""
    document_id: UUID
    from_version: int
    to_version: int
    from_timestamp: datetime
    to_timestamp: datetime
    section_diffs: list[SectionDiff]
    summary: str  # Auto-generated summary of changes


class RestoreVersionRequest(BaseModel):
    """Request to restore a document to a specific version."""
    version_number: int = Field(..., ge=1)
    change_summary: Optional[str] = Field(
        None,
        max_length=500,
        description="Summary for the restore operation"
    )
