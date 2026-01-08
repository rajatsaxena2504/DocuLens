from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator, model_validator
import re


# Valid role names
VALID_ROLES = ('owner', 'editor', 'reviewer', 'viewer')


class OrganizationCreate(BaseModel):
    name: str
    slug: Optional[str] = None  # Auto-generated from name if not provided
    settings: Optional[Dict[str, Any]] = None

    @field_validator('slug', mode='before')
    @classmethod
    def validate_slug(cls, v, info):
        if v is None:
            return v
        # Ensure slug is lowercase and contains only valid characters
        slug = v.lower().strip()
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', slug):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return slug


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Multi-role Support ============

class OrganizationMemberRoles(BaseModel):
    """Boolean flags for organization member roles (additive)."""
    is_owner: bool = False
    is_editor: bool = False
    is_reviewer: bool = False
    is_viewer: bool = True  # Default role


class OrganizationMemberCreate(BaseModel):
    """Create organization member with role(s)."""
    email: EmailStr  # Find user by email to add
    # Support both old single role string and new roles object
    role: Optional[str] = None  # Legacy: admin, editor, viewer
    roles: Optional[OrganizationMemberRoles] = None  # New: multi-role

    @model_validator(mode='after')
    def validate_roles(self):
        # If neither provided, default to viewer
        if self.role is None and self.roles is None:
            self.roles = OrganizationMemberRoles()
        # If legacy role provided, convert to roles object
        elif self.role is not None and self.roles is None:
            if self.role not in VALID_ROLES:
                raise ValueError(f'Role must be one of: {", ".join(VALID_ROLES)}')
            self.roles = OrganizationMemberRoles(
                is_owner=self.role == 'owner',
                is_editor=self.role in ('owner', 'editor'),
                is_reviewer=self.role in ('owner', 'reviewer'),
                is_viewer=True,
            )
        return self


class OrganizationMemberUpdate(BaseModel):
    """Update organization member role(s)."""
    # Support both old single role string and new roles object
    role: Optional[str] = None  # Legacy
    roles: Optional[OrganizationMemberRoles] = None  # New: multi-role

    @model_validator(mode='after')
    def validate_roles(self):
        if self.role is None and self.roles is None:
            raise ValueError('Either role or roles must be provided')
        # If legacy role provided, convert to roles object
        if self.role is not None and self.roles is None:
            if self.role not in VALID_ROLES:
                raise ValueError(f'Role must be one of: {", ".join(VALID_ROLES)}')
            self.roles = OrganizationMemberRoles(
                is_owner=self.role == 'owner',
                is_editor=self.role in ('owner', 'editor'),
                is_reviewer=self.role in ('owner', 'reviewer'),
                is_viewer=True,
            )
        return self


class OrganizationMemberResponse(BaseModel):
    """Organization member response with multi-role support."""
    id: UUID
    user_id: UUID
    # Multi-role fields
    roles: List[str]  # List of role names: ['admin', 'editor', ...]
    primary_role: str  # Highest privilege role for display
    # Legacy field for backwards compatibility
    role: str
    joined_at: datetime
    # Include user info
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    # Nested user object for frontend convenience
    user: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class OrganizationWithMembers(OrganizationResponse):
    members: List[OrganizationMemberResponse] = []
    member_count: int = 0


class OrganizationInvite(BaseModel):
    email: EmailStr
    roles: Optional[OrganizationMemberRoles] = None
    role: Optional[str] = None  # Legacy

    @model_validator(mode='after')
    def validate_roles(self):
        if self.role is None and self.roles is None:
            self.roles = OrganizationMemberRoles()
        elif self.role is not None and self.roles is None:
            if self.role not in VALID_ROLES:
                raise ValueError(f'Role must be one of: {", ".join(VALID_ROLES)}')
            self.roles = OrganizationMemberRoles(
                is_owner=self.role == 'owner',
                is_editor=self.role in ('owner', 'editor'),
                is_reviewer=self.role in ('owner', 'reviewer'),
                is_viewer=True,
            )
        return self


class UserOrganization(BaseModel):
    """Organization info as seen by a user (includes their roles)."""
    id: UUID
    name: str
    slug: str
    # Multi-role fields
    roles: List[str]  # User's roles in this org
    primary_role: str  # Highest privilege role for display
    # Legacy field for backwards compatibility
    role: str
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Membership Requests ============

class MembershipRequestCreate(BaseModel):
    """Request to join an organization."""
    organization_id: UUID


class MembershipRequestResponse(BaseModel):
    """Response for a membership request."""
    id: UUID
    organization_id: UUID
    user_id: UUID
    status: str  # pending, approved, rejected
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[UUID] = None
    # Include user info
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    # Include org info
    organization_name: Optional[str] = None
    organization_slug: Optional[str] = None

    class Config:
        from_attributes = True


class MembershipRequestReview(BaseModel):
    """Review (approve/reject) a membership request."""
    action: str  # approve, reject

    @field_validator('action')
    @classmethod
    def validate_action(cls, v):
        if v not in ('approve', 'reject'):
            raise ValueError("Action must be 'approve' or 'reject'")
        return v
