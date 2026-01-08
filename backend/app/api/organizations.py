from typing import List, Optional
from uuid import UUID
from datetime import datetime
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Organization, OrganizationMember, MembershipRequest, User
from app.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMemberResponse,
    OrganizationWithMembers,
    UserOrganization,
    MembershipRequestCreate,
    MembershipRequestResponse,
    MembershipRequestReview,
)
from app.api.deps import get_current_user_optional, check_org_membership, require_superadmin, get_current_user

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


def _build_member_response(member: OrganizationMember, user: User) -> OrganizationMemberResponse:
    """Build OrganizationMemberResponse with multi-role support."""
    return OrganizationMemberResponse(
        id=member.id,
        user_id=member.user_id,
        roles=member.roles,
        primary_role=member.primary_role,
        role=member.primary_role,  # Legacy field
        joined_at=member.joined_at,
        user_email=user.email,
        user_name=user.name,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
        },
    )


# ============ Organizations ============

@router.post("", response_model=OrganizationResponse)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new organization (superadmin only)"""
    # Only superadmins can create organizations
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Only superadmins can create organizations")

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
    db.commit()
    db.refresh(org)

    return org


@router.get("", response_model=List[UserOrganization])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all organizations the current user is a member of (or all for superadmin)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Superadmins see all organizations
    if current_user and current_user.is_superadmin:
        orgs = db.query(Organization).all()
        return [
            UserOrganization(
                id=org.id,
                name=org.name,
                slug=org.slug,
                roles=["owner", "editor", "reviewer", "viewer"],  # Full access
                primary_role="owner",
                role="owner",  # Legacy
                member_count=len(org.members),
                created_at=org.created_at,
            )
            for org in orgs
        ]

    # Get organizations with user's membership
    memberships = (
        db.query(OrganizationMember, Organization)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .filter(OrganizationMember.user_id == user_id)
        .all()
    )

    return [
        UserOrganization(
            id=org.id,
            name=org.name,
            slug=org.slug,
            roles=member.roles,
            primary_role=member.primary_role,
            role=member.primary_role,  # Legacy
            member_count=len(org.members),
            created_at=org.created_at,
        )
        for member, org in memberships
    ]


@router.get("/{org_id}", response_model=OrganizationWithMembers)
def get_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get organization details (must be a member or superadmin)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check membership (or superadmin)
    membership = check_org_membership(db, user_id, org_id, current_user)
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get members with user info
    members_query = (
        db.query(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == org_id)
        .all()
    )

    members = [_build_member_response(member, user) for member, user in members_query]

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
    """Update organization (owner or superadmin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check owner membership or superadmin
    is_superadmin = current_user and current_user.is_superadmin
    membership = check_org_membership(db, user_id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

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
    """Delete organization (owner or superadmin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check owner membership or superadmin
    is_superadmin = current_user and current_user.is_superadmin
    membership = check_org_membership(db, user_id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

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

    # Check membership (or superadmin)
    membership = check_org_membership(db, user_id, org_id, current_user)
    if not membership:
        raise HTTPException(status_code=404, detail="Organization not found")

    members_query = (
        db.query(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.joined_at)
        .all()
    )

    return [_build_member_response(member, user) for member, user in members_query]


@router.get("/{org_id}/available-users")
def list_available_users(
    org_id: UUID,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List users who are not members of this organization (owner only).

    Used for the 'Add Members' modal to show searchable list of available users.
    """
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check owner membership or superadmin
    is_superadmin = current_user and current_user.is_superadmin
    membership = check_org_membership(db, user_id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

    # Get IDs of current members
    member_ids = (
        db.query(OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == org_id)
        .subquery()
    )

    # Query users not in the org
    query = db.query(User).filter(
        User.id.notin_(member_ids),
        User.is_active == True,
    )

    # Apply search filter if provided
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(User.email).like(search_term)) |
            (func.lower(User.name).like(search_term))
        )

    users = query.order_by(User.email).limit(50).all()

    return [
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
        }
        for user in users
    ]


@router.post("/{org_id}/members", response_model=OrganizationMemberResponse)
def add_member(
    org_id: UUID,
    data: OrganizationMemberCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Add a member to an organization (owner or superadmin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check owner membership or superadmin
    is_superadmin = current_user and current_user.is_superadmin
    membership = check_org_membership(db, user_id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

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

    # Get roles from schema (handles both legacy role and new roles object)
    roles = data.roles

    # Add member with roles
    new_member = OrganizationMember(
        organization_id=org_id,
        user_id=new_user.id,
        role=roles.is_owner and "owner" or roles.is_editor and "editor" or roles.is_reviewer and "reviewer" or "viewer",
        is_owner=roles.is_owner,
        is_editor=roles.is_editor,
        is_reviewer=roles.is_reviewer,
        is_viewer=roles.is_viewer,
        invited_by=user_id,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return _build_member_response(new_member, new_user)


@router.post("/{org_id}/members/bulk")
def add_members_bulk(
    org_id: UUID,
    data: dict,  # {"user_ids": [...], "roles": {...}}
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Add multiple members to an organization at once (owner or superadmin only).

    Request body:
    {
        "user_ids": ["uuid1", "uuid2", ...],
        "roles": {"is_owner": false, "is_editor": true, "is_reviewer": false, "is_viewer": false}
    }
    """
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check owner membership or superadmin
    is_superadmin = current_user and current_user.is_superadmin
    membership = check_org_membership(db, user_id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

    user_ids = data.get("user_ids", [])
    roles = data.get("roles", {})

    if not user_ids:
        raise HTTPException(status_code=400, detail="No users specified")

    # Get existing member IDs
    existing_ids = set(
        str(m.user_id) for m in db.query(OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == org_id)
        .all()
    )

    added = []
    skipped = []

    for uid in user_ids:
        if uid in existing_ids:
            skipped.append(uid)
            continue

        # Verify user exists
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            skipped.append(uid)
            continue

        # Determine primary role for legacy field
        primary_role = (
            "owner" if roles.get("is_owner") else
            "editor" if roles.get("is_editor") else
            "reviewer" if roles.get("is_reviewer") else
            "viewer"
        )

        new_member = OrganizationMember(
            organization_id=org_id,
            user_id=user.id,
            role=primary_role,
            is_owner=roles.get("is_owner", False),
            is_editor=roles.get("is_editor", False),
            is_reviewer=roles.get("is_reviewer", False),
            is_viewer=roles.get("is_viewer", True),
            invited_by=user_id,
        )
        db.add(new_member)
        added.append({"id": str(user.id), "email": user.email, "name": user.name})

    db.commit()

    return {
        "added": added,
        "skipped": skipped,
        "message": f"Added {len(added)} member(s)" + (f", skipped {len(skipped)}" if skipped else "")
    }


@router.patch("/{org_id}/members/{member_id}", response_model=OrganizationMemberResponse)
def update_member_role(
    org_id: UUID,
    member_id: UUID,
    data: OrganizationMemberUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update a member's role(s) (owner or superadmin only)"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Check owner membership or superadmin
    is_superadmin = current_user and current_user.is_superadmin
    admin_membership = check_org_membership(db, user_id, org_id, current_user)

    if not admin_membership or (not admin_membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

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

    # Get roles from schema
    roles = data.roles

    # Prevent demoting last owner
    if target_member.is_owner and not roles.is_owner:
        owner_count = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.is_owner == True,
            )
            .count()
        )
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last owner")

    # Update roles
    target_member.is_owner = roles.is_owner
    target_member.is_editor = roles.is_editor
    target_member.is_reviewer = roles.is_reviewer
    target_member.is_viewer = roles.is_viewer
    # Update legacy field
    target_member.role = roles.is_owner and "owner" or roles.is_editor and "editor" or roles.is_reviewer and "reviewer" or "viewer"

    db.commit()
    db.refresh(target_member)

    # Get user info
    member_user = db.query(User).filter(User.id == target_member.user_id).first()

    return _build_member_response(target_member, member_user)


@router.delete("/{org_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: UUID,
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Remove a member from an organization (owner/superadmin only, or self-removal)"""
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

    # Allow self-removal, owner removal, or superadmin removal
    is_self = target_member.user_id == user_id
    is_superadmin = current_user and current_user.is_superadmin
    membership = check_org_membership(db, user_id, org_id, current_user)
    is_owner = membership and membership.is_owner

    if not is_self and not is_owner and not is_superadmin:
        raise HTTPException(status_code=403, detail="Owner access required")

    # Prevent removing last owner
    if target_member.is_owner:
        owner_count = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.is_owner == True,
            )
            .count()
        )
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last owner")

    db.delete(target_member)
    db.commit()


# ============ Membership Requests ============

def _build_request_response(request: MembershipRequest, user: User, org: Organization) -> MembershipRequestResponse:
    """Build MembershipRequestResponse with user and org info."""
    return MembershipRequestResponse(
        id=request.id,
        organization_id=request.organization_id,
        user_id=request.user_id,
        status=request.status,
        requested_at=request.requested_at,
        reviewed_at=request.reviewed_at,
        reviewed_by=request.reviewed_by,
        user_email=user.email,
        user_name=user.name,
        organization_name=org.name,
        organization_slug=org.slug,
    )


@router.get("/all/public", response_model=List[dict])
def list_public_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations (for join request dropdown).

    Returns basic info about all orgs for users to request membership.
    """
    orgs = db.query(Organization).all()
    return [
        {
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "member_count": len(org.members),
        }
        for org in orgs
    ]


@router.post("/requests", response_model=MembershipRequestResponse)
def create_membership_request(
    data: MembershipRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request to join an organization."""
    # Check organization exists
    org = db.query(Organization).filter(Organization.id == data.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check if already a member
    existing_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == data.organization_id,
            OrganizationMember.user_id == current_user.id,
        )
        .first()
    )
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member of this organization")

    # Check if request already pending
    existing_request = (
        db.query(MembershipRequest)
        .filter(
            MembershipRequest.organization_id == data.organization_id,
            MembershipRequest.user_id == current_user.id,
            MembershipRequest.status == "pending",
        )
        .first()
    )
    if existing_request:
        raise HTTPException(status_code=400, detail="Request already pending")

    # Create request
    request = MembershipRequest(
        organization_id=data.organization_id,
        user_id=current_user.id,
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    return _build_request_response(request, current_user, org)


@router.get("/requests/my", response_model=List[MembershipRequestResponse])
def list_my_membership_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List current user's membership requests."""
    requests = (
        db.query(MembershipRequest, Organization)
        .join(Organization, Organization.id == MembershipRequest.organization_id)
        .filter(MembershipRequest.user_id == current_user.id)
        .order_by(MembershipRequest.requested_at.desc())
        .all()
    )

    return [
        _build_request_response(req, current_user, org)
        for req, org in requests
    ]


@router.get("/{org_id}/requests", response_model=List[MembershipRequestResponse])
def list_org_membership_requests(
    org_id: UUID,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List membership requests for an organization (owner or superadmin only)."""
    # Check owner membership or superadmin
    is_superadmin = current_user.is_superadmin
    membership = check_org_membership(db, current_user.id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    query = (
        db.query(MembershipRequest, User)
        .join(User, User.id == MembershipRequest.user_id)
        .filter(MembershipRequest.organization_id == org_id)
    )

    if status_filter:
        query = query.filter(MembershipRequest.status == status_filter)

    requests = query.order_by(MembershipRequest.requested_at.desc()).all()

    return [
        _build_request_response(req, user, org)
        for req, user in requests
    ]


@router.post("/{org_id}/requests/{request_id}/review", response_model=MembershipRequestResponse)
def review_membership_request(
    org_id: UUID,
    request_id: UUID,
    data: MembershipRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a membership request (owner or superadmin only)."""
    # Check owner membership or superadmin
    is_superadmin = current_user.is_superadmin
    membership = check_org_membership(db, current_user.id, org_id, current_user)

    if not membership or (not membership.is_owner and not is_superadmin):
        raise HTTPException(status_code=403, detail="Owner access required")

    # Get request
    request = (
        db.query(MembershipRequest)
        .filter(
            MembershipRequest.id == request_id,
            MembershipRequest.organization_id == org_id,
        )
        .first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    # Update request status
    request.status = "approved" if data.action == "approve" else "rejected"
    request.reviewed_at = datetime.utcnow()
    request.reviewed_by = current_user.id

    # If approved, add user as member with viewer role
    if data.action == "approve":
        new_member = OrganizationMember(
            organization_id=org_id,
            user_id=request.user_id,
            role="viewer",
            is_owner=False,
            is_editor=False,
            is_reviewer=False,
            is_viewer=True,
            invited_by=current_user.id,
        )
        db.add(new_member)

    db.commit()
    db.refresh(request)

    # Get user and org for response
    user = db.query(User).filter(User.id == request.user_id).first()
    org = db.query(Organization).filter(Organization.id == org_id).first()

    return _build_request_response(request, user, org)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_membership_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a pending membership request (user's own request only)."""
    request = (
        db.query(MembershipRequest)
        .filter(
            MembershipRequest.id == request_id,
            MembershipRequest.user_id == current_user.id,
        )
        .first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")

    db.delete(request)
    db.commit()
