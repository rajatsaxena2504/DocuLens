import uuid
from datetime import datetime
from typing import List
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint, Boolean
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
    """Organization membership with role-based access.

    Supports additive roles - a user can have multiple roles simultaneously.
    Role hierarchy: owner > editor > reviewer > viewer
    """
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
    # Legacy role column (kept for backwards compatibility during transition)
    role = Column(String(20), nullable=False, default="viewer")

    # Boolean role columns (additive roles)
    is_owner = Column(Boolean, default=False, nullable=False)
    is_editor = Column(Boolean, default=False, nullable=False)
    is_reviewer = Column(Boolean, default=False, nullable=False)
    is_viewer = Column(Boolean, default=True, nullable=False)

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
    def roles(self) -> List[str]:
        """Return list of all roles this member has."""
        result = []
        if self.is_owner:
            result.append("owner")
        if self.is_editor:
            result.append("editor")
        if self.is_reviewer:
            result.append("reviewer")
        if self.is_viewer:
            result.append("viewer")
        return result

    @property
    def primary_role(self) -> str:
        """Return highest-privilege role for display purposes."""
        if self.is_owner:
            return "owner"
        if self.is_editor:
            return "editor"
        if self.is_reviewer:
            return "reviewer"
        return "viewer"

    def has_role(self, role: str) -> bool:
        """Check if member has a specific role."""
        role_map = {
            "owner": self.is_owner,
            "editor": self.is_editor,
            "reviewer": self.is_reviewer,
            "viewer": self.is_viewer,
        }
        return role_map.get(role, False)

    def can_edit(self) -> bool:
        """Check if member can edit documents (owner or editor)."""
        return self.is_owner or self.is_editor

    def can_review(self) -> bool:
        """Check if member can review documents (owner or reviewer)."""
        return self.is_owner or self.is_reviewer

    def can_view(self) -> bool:
        """Check if member can view resources (any role)."""
        return self.is_owner or self.is_editor or self.is_reviewer or self.is_viewer


class MembershipRequest(Base):
    """Request to join an organization - requires approval from owner or superadmin."""
    __tablename__ = "membership_requests"

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
    status = Column(String(20), default="pending", nullable=False)  # pending, approved, rejected
    requested_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint('organization_id', 'user_id', name='uq_membership_request'),
    )

    # Relationships
    organization = relationship("Organization")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
