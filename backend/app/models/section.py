import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID, GUIDArray


class Section(Base):
    __tablename__ = "sections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)  # Used as prompt context
    default_order = Column(Integer)
    applicable_doc_types = Column(GUIDArray())  # Array of document_type IDs
    is_system = Column(Boolean, default=True)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)  # Creator
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="sections")
    user = relationship("User", back_populates="custom_sections")
    document_type_mappings = relationship(
        "DocumentTypeSection",
        back_populates="section",
        cascade="all, delete-orphan",
    )
    document_sections = relationship("DocumentSection", back_populates="section")
