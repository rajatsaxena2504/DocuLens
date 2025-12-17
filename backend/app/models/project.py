import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID, JSONType


class Project(Base):
    """
    Represents a repository/codebase that can be analyzed.
    Can be linked to an SDLCProject for organization.
    """
    __tablename__ = "projects"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sdlc_project_id = Column(GUID(), ForeignKey("sdlc_projects.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    source_type = Column(String(50), nullable=False)  # 'upload' or 'github'
    repo_type = Column(String(50), nullable=True)  # 'frontend', 'backend', 'api', 'mobile', 'infra', etc.
    github_url = Column(String(500))
    storage_path = Column(String(500))  # Local path to extracted files
    analysis_data = Column(JSONType())  # Cached analysis results
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="projects")
    sdlc_project = relationship("SDLCProject", back_populates="repositories")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
