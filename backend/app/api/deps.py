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


# ============ Organization Permission Helpers ============

def check_org_membership(
    db: Session,
    user_id: UUID,
    org_id: UUID,
) -> Optional[OrganizationMember]:
    """Check if user is a member of an organization. Returns membership or None."""
    return (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )


def check_org_admin(
    db: Session,
    user_id: UUID,
    org_id: UUID,
) -> bool:
    """Check if user is an admin of an organization."""
    membership = check_org_membership(db, user_id, org_id)
    return membership is not None and membership.role == "admin"


def check_org_editor(
    db: Session,
    user_id: UUID,
    org_id: UUID,
) -> bool:
    """Check if user has editor or admin role in an organization."""
    membership = check_org_membership(db, user_id, org_id)
    return membership is not None and membership.role in ("admin", "editor")


def require_org_membership(
    db: Session,
    user_id: UUID,
    org_id: UUID,
) -> OrganizationMember:
    """Require user to be a member of an organization. Raises 403 if not."""
    membership = check_org_membership(db, user_id, org_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    return membership


def require_org_admin(
    db: Session,
    user_id: UUID,
    org_id: UUID,
) -> OrganizationMember:
    """Require user to be an admin of an organization. Raises 403 if not."""
    membership = require_org_membership(db, user_id, org_id)
    if membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return membership


def require_org_editor(
    db: Session,
    user_id: UUID,
    org_id: UUID,
) -> OrganizationMember:
    """Require user to be an editor or admin of an organization. Raises 403 if not."""
    membership = require_org_membership(db, user_id, org_id)
    if membership.role not in ("admin", "editor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor access required",
        )
    return membership
