import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, ForeignKey, Boolean, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID


class GeneratedContent(Base):
    __tablename__ = "generated_content"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_section_id = Column(
        GUID(),
        ForeignKey("document_sections.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    is_ai_generated = Column(Boolean, default=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    modified_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    modified_at = Column(DateTime, nullable=True)

    # Relationships
    document_section = relationship("DocumentSection", back_populates="generated_content")

    __table_args__ = (
        UniqueConstraint("document_section_id", "version", name="uq_section_version"),
    )
