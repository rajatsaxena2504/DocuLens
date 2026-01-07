import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID


class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_system = Column(Boolean, default=True)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)  # Creator
    stage_id = Column(GUID(), ForeignKey("sdlc_stages.id"), nullable=True)
    is_org_default = Column(Boolean, default=False)  # Admin can mark as org default
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="document_types")
    user = relationship("User", back_populates="custom_document_types")
    stage = relationship("SDLCStage", back_populates="document_types")
    documents = relationship("Document", back_populates="document_type")
    default_sections = relationship(
        "DocumentTypeSection",
        back_populates="document_type",
        cascade="all, delete-orphan",
    )


class DocumentTypeSection(Base):
    __tablename__ = "document_type_sections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_type_id = Column(
        GUID(),
        ForeignKey("document_types.id", ondelete="CASCADE"),
        nullable=False,
    )
    section_id = Column(
        GUID(),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
    )
    default_order = Column(Integer)
    is_required = Column(Boolean, default=False)

    # Relationships
    document_type = relationship("DocumentType", back_populates="default_sections")
    section = relationship("Section", back_populates="document_type_mappings")
