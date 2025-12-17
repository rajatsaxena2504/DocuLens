from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.core.security import decode_access_token
from app.models import User
import uuid
from datetime import datetime

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# AUTH DISABLED: Mock user ID for development
MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"
MOCK_USER_EMAIL = "dev@doculens.local"
MOCK_USER_NAME = "Developer"


def get_db() -> Generator:
    """Dependency for getting database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_mock_user(db: Session) -> User:
    """Get or create a mock user for development when auth is disabled."""
    user = db.query(User).filter(User.id == MOCK_USER_ID).first()
    if user is None:
        # Create mock user if it doesn't exist
        user = User(
            id=uuid.UUID(MOCK_USER_ID),
            email=MOCK_USER_EMAIL,
            password_hash="disabled",  # No real password needed
            name=MOCK_USER_NAME,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    Dependency for getting the current authenticated user.
    AUTH DISABLED: Returns mock user instead of validating token.
    """
    # AUTH DISABLED: Return mock user instead of validating token
    return get_or_create_mock_user(db)

    # Original authentication logic - uncomment to re-enable
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
    """


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    Dependency for optionally getting the current user.
    AUTH DISABLED: Returns mock user (same as get_current_user).
    When auth is enabled, this would return None if no valid token.
    """
    # AUTH DISABLED: Return mock user
    return get_or_create_mock_user(db)
