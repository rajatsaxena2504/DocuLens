import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID


class ProjectMember(Base):
    """Project membership with role-based access control."""
    __tablename__ = "project_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    sdlc_project_id = Column(
        GUID(),
        ForeignKey("sdlc_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(20), nullable=False)  # 'owner', 'editor', 'viewer'
    added_by = Column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    added_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("SDLCProject", back_populates="members")
    user = relationship("User", foreign_keys=[user_id], back_populates="project_memberships")
    added_by_user = relationship("User", foreign_keys=[added_by])

    __table_args__ = (
        UniqueConstraint("sdlc_project_id", "user_id", name="uq_project_member"),
    )
