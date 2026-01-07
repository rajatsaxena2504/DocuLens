import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID


class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        GUID(),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,  # Now optional - can use sdlc_project_id instead
    )
    sdlc_project_id = Column(
        GUID(),
        ForeignKey("sdlc_projects.id", ondelete="CASCADE"),
        nullable=True,  # SDLC project this document belongs to
    )
    document_type_id = Column(GUID(), ForeignKey("document_types.id"))
    stage_id = Column(GUID(), ForeignKey("sdlc_stages.id"), nullable=True)
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(500), nullable=False)
    status = Column(String(50), default="draft")  # draft, sections_approved, generating, completed
    current_version = Column(Integer, default=1)
    # File-level documentation fields
    file_path = Column(String(500), nullable=True)
    is_file_level = Column(Boolean, default=False)
    file_type = Column(String(20), nullable=True)  # python, sql, ipynb, js, ts
    file_analysis = Column(Text, nullable=True)  # JSON analysis data
    # Review workflow fields
    review_status = Column(String(30), default="draft")  # draft, pending_review, changes_requested, approved
    assigned_reviewer_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="documents")
    sdlc_project = relationship("SDLCProject", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    stage = relationship("SDLCStage", back_populates="documents")
    user = relationship("User", back_populates="documents")
    sections = relationship(
        "DocumentSection",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentSection.display_order",
    )
    versions = relationship(
        "DocumentVersion",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentVersion.version_number.desc()",
    )
    reviews = relationship(
        "DocumentReview",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentReview.reviewed_at.desc()",
    )
    assigned_reviewer = relationship("User", foreign_keys=[assigned_reviewer_id])
    imports = relationship(
        "ConnectorImport",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    sttm_mappings = relationship(
        "STTMMapping",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="STTMMapping.display_order",
    )


class DocumentSection(Base):
    __tablename__ = "document_sections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        GUID(),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    section_id = Column(GUID(), ForeignKey("sections.id"), nullable=True)
    custom_title = Column(String(255))
    custom_description = Column(Text)
    display_order = Column(Integer, nullable=False)
    is_included = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="sections")
    section = relationship("Section", back_populates="document_sections")
    generated_content = relationship(
        "GeneratedContent",
        back_populates="document_section",
        cascade="all, delete-orphan",
        order_by="GeneratedContent.version.desc()",
    )

    @property
    def title(self) -> str:
        """Get the effective title (custom or from section library)."""
        if self.custom_title:
            return self.custom_title
        if self.section:
            return self.section.name
        return "Untitled Section"

    @property
    def description(self) -> str:
        """Get the effective description (custom or from section library)."""
        if self.custom_description:
            return self.custom_description
        if self.section:
            return self.section.description
        return ""
