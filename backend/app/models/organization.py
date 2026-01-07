import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.types import GUID, JSONType


class Organization(Base):
    """Organization/tenant model for multi-tenant support."""
    __tablename__ = "organizations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    settings = Column(JSONType, default=dict)  # Org-level settings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship(
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    projects = relationship(
        "SDLCProject",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    document_types = relationship(
        "DocumentType",
        back_populates="organization",
        foreign_keys="DocumentType.organization_id"
    )
    sections = relationship(
        "Section",
        back_populates="organization",
        foreign_keys="Section.organization_id"
    )
    connectors = relationship(
        "Connector",
        back_populates="organization",
        cascade="all, delete-orphan"
    )


class OrganizationMember(Base):
    """Organization membership with role-based access."""
    __tablename__ = "organization_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        GUID(),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    role = Column(String(20), nullable=False, default="viewer")  # admin, editor, viewer
    invited_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('organization_id', 'user_id', name='uq_org_user'),
    )

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="organization_memberships", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_editor(self) -> bool:
        return self.role in ("admin", "editor")

    @property
    def can_view(self) -> bool:
        return self.role in ("admin", "editor", "viewer")
