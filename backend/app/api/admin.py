"""Admin API endpoints for superadmin operations.

Superadmins can:
- List all users in the system
- Grant/revoke superadmin status
- List all organizations
- Create organizations with initial admins
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import User, Organization, OrganizationMember
from app.api.deps import get_current_user, require_superadmin
from app.api.organizations import generate_slug, ensure_unique_slug

router = APIRouter()


# ============ Schemas ============

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    is_active: bool
    is_superadmin: bool
    created_at: str

    class Config:
        from_attributes = True


class OrganizationAdminResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    member_count: int
    created_at: str

    class Config:
        from_attributes = True


class CreateOrganizationWithOwner(BaseModel):
    """Create org and assign initial owner by email."""
    name: str
    slug: Optional[str] = None
    owner_email: EmailStr


class GrantSuperadminRequest(BaseModel):
    """Grant superadmin to user by email."""
    email: EmailStr


# ============ User Management ============

@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users (superadmin only)."""
    require_superadmin(current_user)

    users = db.query(User).order_by(User.created_at.desc()).all()

    return [
        UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            is_superadmin=user.is_superadmin,
            created_at=user.created_at.isoformat(),
        )
        for user in users
    ]


@router.post("/users/{user_id}/superadmin")
def grant_superadmin(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant superadmin status to a user (superadmin only)."""
    require_superadmin(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_superadmin:
        return {"message": f"{user.email} is already a superadmin"}

    user.is_superadmin = True
    db.commit()

    return {"message": f"Granted superadmin to {user.email}"}


@router.delete("/users/{user_id}/superadmin")
def revoke_superadmin(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke superadmin status from a user (superadmin only)."""
    require_superadmin(current_user)

    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke your own superadmin status"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_superadmin:
        return {"message": f"{user.email} is not a superadmin"}

    # Ensure at least one superadmin remains
    superadmin_count = db.query(User).filter(User.is_superadmin == True).count()
    if superadmin_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke the last superadmin"
        )

    user.is_superadmin = False
    db.commit()

    return {"message": f"Revoked superadmin from {user.email}"}


@router.post("/users/superadmin")
def grant_superadmin_by_email(
    data: GrantSuperadminRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant superadmin status to a user by email (superadmin only)."""
    require_superadmin(current_user)

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_superadmin:
        return {"message": f"{user.email} is already a superadmin"}

    user.is_superadmin = True
    db.commit()

    return {"message": f"Granted superadmin to {user.email}"}


# ============ Organization Management ============

@router.get("/organizations", response_model=List[OrganizationAdminResponse])
def list_all_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations (superadmin only)."""
    require_superadmin(current_user)

    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()

    return [
        OrganizationAdminResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            member_count=len(org.members),
            created_at=org.created_at.isoformat(),
        )
        for org in orgs
    ]


@router.post("/organizations", response_model=OrganizationAdminResponse)
def create_organization_with_owner(
    data: CreateOrganizationWithOwner,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an organization and assign initial owner (superadmin only).

    This is used by superadmins to create orgs and hand them off to org owners.
    """
    require_superadmin(current_user)

    # Find owner user by email
    owner_user = db.query(User).filter(User.email == data.owner_email).first()
    if not owner_user:
        raise HTTPException(
            status_code=404,
            detail=f"User with email {data.owner_email} not found"
        )

    # Generate slug
    base_slug = data.slug if data.slug else generate_slug(data.name)
    slug = ensure_unique_slug(db, base_slug)

    # Create organization
    org = Organization(
        name=data.name,
        slug=slug,
        settings={},
    )
    db.add(org)
    db.flush()

    # Add owner user as owner member
    member = OrganizationMember(
        organization_id=org.id,
        user_id=owner_user.id,
        role="owner",
        is_owner=True,
        is_editor=True,
        is_reviewer=True,
        is_viewer=True,
        invited_by=current_user.id,
    )
    db.add(member)
    db.commit()
    db.refresh(org)

    return OrganizationAdminResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        member_count=1,
        created_at=org.created_at.isoformat(),
    )


@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization_admin(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete any organization (superadmin only)."""
    require_superadmin(current_user)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
