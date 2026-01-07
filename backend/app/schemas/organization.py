from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator
import re


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


class OrganizationMemberCreate(BaseModel):
    email: EmailStr  # Find user by email to add
    role: str = "viewer"  # admin, editor, viewer

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ('admin', 'editor', 'viewer'):
            raise ValueError('Role must be admin, editor, or viewer')
        return v


class OrganizationMemberUpdate(BaseModel):
    role: str

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ('admin', 'editor', 'viewer'):
            raise ValueError('Role must be admin, editor, or viewer')
        return v


class OrganizationMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    # Include user info
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class OrganizationWithMembers(OrganizationResponse):
    members: List[OrganizationMemberResponse] = []
    member_count: int = 0


class OrganizationInvite(BaseModel):
    email: EmailStr
    role: str = "viewer"

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v not in ('admin', 'editor', 'viewer'):
            raise ValueError('Role must be admin, editor, or viewer')
        return v


class UserOrganization(BaseModel):
    """Organization info as seen by a user (includes their role)"""
    id: UUID
    name: str
    slug: str
    role: str  # User's role in this org
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
