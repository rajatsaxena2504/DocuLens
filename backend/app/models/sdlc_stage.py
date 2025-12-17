import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID


class SDLCStage(Base):
    __tablename__ = "sdlc_stages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    display_order = Column(Integer, nullable=False)
    icon = Column(String(50))  # Lucide icon name
    color = Column(String(50))  # Tailwind color name
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="stage")
    document_types = relationship("DocumentType", back_populates="stage")
