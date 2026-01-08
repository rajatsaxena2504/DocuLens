from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str]
    is_active: bool = True
    email_verified: bool = False
    is_superadmin: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithOrganizations(UserResponse):
    """User response with their organizations"""
    organizations: list = []  # List of UserOrganization


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
