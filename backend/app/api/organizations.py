from typing import List, Optional
from uuid import UUID
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Organization, OrganizationMember, User
from app.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMemberResponse,
    OrganizationWithMembers,
    UserOrganization,
)
from app.api.deps import get_current_user_optional

router = APIRouter()


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from organization name"""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug or 'org'


def ensure_unique_slug(db: Session, base_slug: str, exclude_id: UUID = None) -> str:
    """Ensure slug is unique by appending numbers if needed"""
    slug = base_slug
    counter = 1
    while True:
        query = db.query(Organization).filter(Organization.slug == slug)
        if exclude_id:
            query = query.filter(Organization.id != exclude_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


# ============ Organizations ============

@router.post("", response_model=OrganizationResponse)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a new organization and add the creator as admin"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Generate slug if not provided
    base_slug = data.slug if data.slug else generate_slug(data.name)
    slug = ensure_unique_slug(db, base_slug)

    # Create organization
    org = Organization(
        name=data.name,
        slug=slug,
        settings=data.settings or {},
    )
    db.add(org)
    db.flush()  # Get the org ID

    # Add creator as admin member
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user_id,
        role="admin",
        invited_by=None,  # Self-created
    )
    db.add(member)
    db.commit()
    db.refresh(org)

    return org


@router.get("", response_model=List[UserOrganization])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all organizations the current user is a member of"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Get organizations with user's role and member count
    results = (
        db.query(
            Organization,
            OrganizationMember.role,
            func.count(OrganizationMember.id).over(partition_by=Organization.id).label('member_count')
        )
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .filter(OrganizationMember.user_id == user_id)
        .all()
    )

    return [
        UserOrganization(
            id=org.id,
            name=org.name,
            slug=org.slug,
            role=role,
            member_count=member_count,
            created_at=org.created_at,
        )
        for org, role, member_count in results
    ]


@router.get("/{org_id}", response_model=OrganizationWithMembers)
def get_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get organization details (must be a member)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check membership
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")

    org = db.query(Organization).filter(Organization.id == org_id).first()

    # Get members with user info
    members_query = (
        db.query(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == org_id)
        .all()
    )

    members = [
        OrganizationMemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            user_email=user.email,
            user_name=user.name,
        )
        for member, user in members_query
    ]

    return OrganizationWithMembers(
        id=org.id,
        name=org.name,
        slug=org.slug,
        settings=org.settings,
        created_at=org.created_at,
        updated_at=org.updated_at,
        members=members,
        member_count=len(members),
    )


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: UUID,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update organization (admin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check admin membership
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.role == "admin",
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Admin access required")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    db.commit()
    db.refresh(org)
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Delete organization (admin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check admin membership
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.role == "admin",
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Admin access required")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()


# ============ Organization Members ============

@router.get("/{org_id}/members", response_model=List[OrganizationMemberResponse])
def list_members(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all members of an organization"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check membership
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")

    members_query = (
        db.query(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.joined_at)
        .all()
    )

    return [
        OrganizationMemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            user_email=user.email,
            user_name=user.name,
        )
        for member, user in members_query
    ]


@router.post("/{org_id}/members", response_model=OrganizationMemberResponse)
def add_member(
    org_id: UUID,
    data: OrganizationMemberCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Add a member to an organization (admin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check admin membership
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.role == "admin",
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Find user by email
    new_user = db.query(User).filter(User.email == data.email).first()
    if not new_user:
        raise HTTPException(status_code=404, detail="User not found with that email")

    # Check if already a member
    existing = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == new_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    # Add member
    new_member = OrganizationMember(
        organization_id=org_id,
        user_id=new_user.id,
        role=data.role,
        invited_by=user_id,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return OrganizationMemberResponse(
        id=new_member.id,
        user_id=new_member.user_id,
        role=new_member.role,
        joined_at=new_member.joined_at,
        user_email=new_user.email,
        user_name=new_user.name,
    )


@router.patch("/{org_id}/members/{member_id}", response_model=OrganizationMemberResponse)
def update_member_role(
    org_id: UUID,
    member_id: UUID,
    data: OrganizationMemberUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update a member's role (admin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check admin membership
    admin_membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.role == "admin",
        )
        .first()
    )
    if not admin_membership:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Get target member
    target_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
        .first()
    )
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Prevent demoting last admin
    if target_member.role == "admin" and data.role != "admin":
        admin_count = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.role == "admin",
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last admin")

    target_member.role = data.role
    db.commit()
    db.refresh(target_member)

    # Get user info
    member_user = db.query(User).filter(User.id == target_member.user_id).first()

    return OrganizationMemberResponse(
        id=target_member.id,
        user_id=target_member.user_id,
        role=target_member.role,
        joined_at=target_member.joined_at,
        user_email=member_user.email if member_user else None,
        user_name=member_user.name if member_user else None,
    )


@router.delete("/{org_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: UUID,
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Remove a member from an organization (admin only, or self-removal)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Get target member
    target_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
        .first()
    )
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Allow self-removal or admin removal
    is_self = target_member.user_id == user_id
    is_admin = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.role == "admin",
        )
        .first()
    ) is not None

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Prevent removing last admin
    if target_member.role == "admin":
        admin_count = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.role == "admin",
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")

    db.delete(target_member)
    db.commit()
