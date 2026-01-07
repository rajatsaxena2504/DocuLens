"""
Seed script for creating test data (user, organization, project).
Run this script to set up initial test data for development.

Usage:
    python scripts/seed_test_data.py
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User, Organization, OrganizationMember, SDLCProject
from app.core.security import get_password_hash
import uuid


def seed_test_data():
    db = SessionLocal()

    try:
        # Check if test user already exists
        existing_user = db.query(User).filter(User.email == "test@doculens.local").first()
        if existing_user:
            print("Test user already exists, skipping user creation")
            user = existing_user
        else:
            # Create test user
            user = User(
                id=uuid.uuid4(),
                email="test@doculens.local",
                password_hash=get_password_hash("testpassword123"),
                name="Test User",
                is_active=True,
                email_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created test user: {user.email}")

        # Check if test org already exists
        existing_org = db.query(Organization).filter(Organization.slug == "test-org").first()
        if existing_org:
            print("Test organization already exists, skipping org creation")
            org = existing_org
        else:
            # Create test organization
            org = Organization(
                id=uuid.uuid4(),
                name="Test Organization",
                slug="test-org",
                settings={},
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"Created test organization: {org.name}")

            # Add user as admin of the organization
            membership = OrganizationMember(
                id=uuid.uuid4(),
                organization_id=org.id,
                user_id=user.id,
                role="admin",
            )
            db.add(membership)
            db.commit()
            print(f"Added {user.email} as admin of {org.name}")

        # Check if test project already exists
        existing_project = db.query(SDLCProject).filter(
            SDLCProject.organization_id == org.id,
            SDLCProject.name == "Sample Project"
        ).first()

        if existing_project:
            print("Test project already exists, skipping project creation")
        else:
            # Create a sample project under the organization
            project = SDLCProject(
                id=uuid.uuid4(),
                organization_id=org.id,
                user_id=user.id,
                name="Sample Project",
                description="A sample SDLC project for testing",
                status="active",
            )
            db.add(project)
            db.commit()
            print(f"Created sample project: {project.name}")

        print("\nSeed data created successfully!")
        print("\nTest credentials:")
        print("  Email: test@doculens.local")
        print("  Password: testpassword123")
        print(f"\nOrganization: {org.name} (/{org.slug})")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_data()
