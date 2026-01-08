from typing import Generator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.core.security import decode_access_token
from app.models import User, OrganizationMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_db() -> Generator:
    """Dependency for getting database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    Dependency for getting the current authenticated user.
    Validates JWT token and returns user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> Optional[User]:
    """
    Dependency for optionally getting the current user.
    Returns None if no valid token (doesn't raise error).
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id: str = payload.get("sub")
    if user_id is None:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency for getting an active user (already checked in get_current_user)."""
    return current_user


# ============ Superadmin Helpers ============

def require_superadmin(user: User) -> User:
    """Require user to be a superadmin. Raises 403 if not."""
    if not user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return user


def _create_superadmin_membership(org_id: UUID, user_id: UUID) -> OrganizationMember:
    """Create a synthetic membership object for superadmins with all roles."""
    # This is an in-memory object, not persisted to database
    member = OrganizationMember()
    member.organization_id = org_id
    member.user_id = user_id
    member.is_owner = True
    member.is_editor = True
    member.is_reviewer = True
    member.is_viewer = True
    member.role = "owner"  # Legacy field for compatibility
    return member


# ============ Organization Permission Helpers ============

def check_org_membership(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> Optional[OrganizationMember]:
    """Check if user is a member of an organization.

    Returns membership or None. Superadmins get synthetic full-access membership.
    """
    # Superadmins bypass membership check - they can access all orgs
    if user and user.is_superadmin:
        return _create_superadmin_membership(org_id, user_id)

    return (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )


def check_org_owner(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> bool:
    """Check if user is an owner of an organization or superadmin."""
    if user and user.is_superadmin:
        return True
    membership = check_org_membership(db, user_id, org_id)
    return membership is not None and membership.is_owner


def check_org_editor(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> bool:
    """Check if user has editor capabilities (owner or editor role)."""
    if user and user.is_superadmin:
        return True
    membership = check_org_membership(db, user_id, org_id)
    return membership is not None and membership.can_edit()


def check_org_reviewer(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> bool:
    """Check if user has reviewer capabilities (owner or reviewer role)."""
    if user and user.is_superadmin:
        return True
    membership = check_org_membership(db, user_id, org_id)
    return membership is not None and membership.can_review()


def require_org_membership(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> OrganizationMember:
    """Require user to be a member of an organization. Raises 403 if not."""
    membership = check_org_membership(db, user_id, org_id, user)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    return membership


def require_org_owner(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> OrganizationMember:
    """Require user to be an owner of an organization. Raises 403 if not."""
    membership = require_org_membership(db, user_id, org_id, user)
    if not membership.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required",
        )
    return membership


def require_org_editor(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> OrganizationMember:
    """Require user to have editor access. Raises 403 if not."""
    membership = require_org_membership(db, user_id, org_id, user)
    if not membership.can_edit():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor access required",
        )
    return membership


def require_org_reviewer(
    db: Session,
    user_id: UUID,
    org_id: UUID,
    user: Optional[User] = None,
) -> OrganizationMember:
    """Require user to have reviewer access. Raises 403 if not."""
    membership = require_org_membership(db, user_id, org_id, user)
    if not membership.can_review():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewer access required",
        )
    return membership
