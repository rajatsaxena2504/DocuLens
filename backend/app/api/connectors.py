"""
Connectors API - Manage external service integrations (Jira, Confluence, Miro, SharePoint).
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Connector, ConnectorImport, User, Document, OrganizationMember
from app.schemas.connector import (
    ConnectorCreate,
    ConnectorUpdate,
    ConnectorResponse,
    ConnectorWithConfig,
    ConnectorImportResponse,
    TestConnectionResult,
    ImportContentRequest,
    ExternalContent,
    JiraProject,
    JiraIssue,
    ConfluenceSpace,
    ConfluencePage,
    ConnectorType,
)
from app.api.deps import get_current_user_optional

router = APIRouter()


# ============ Helper Functions ============

def get_user_org_membership(
    db: Session, user_id: UUID, org_id: UUID
) -> Optional[OrganizationMember]:
    """Check if user is a member of the organization."""
    return (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )


def require_org_admin(db: Session, user_id: UUID, org_id: UUID) -> OrganizationMember:
    """Require user to be an admin of the organization."""
    membership = get_user_org_membership(db, user_id, org_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return membership


def require_org_member(db: Session, user_id: UUID, org_id: UUID) -> OrganizationMember:
    """Require user to be a member of the organization."""
    membership = get_user_org_membership(db, user_id, org_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    return membership


# ============ Connector CRUD ============

@router.get("/organization/{org_id}", response_model=List[ConnectorResponse])
def list_connectors(
    org_id: UUID,
    connector_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all connectors for an organization."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")
    require_org_member(db, user_id, org_id)

    query = db.query(Connector).filter(Connector.organization_id == org_id)
    if connector_type:
        query = query.filter(Connector.type == connector_type)

    connectors = query.order_by(Connector.created_at.desc()).all()
    return connectors


@router.post("/organization/{org_id}", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
def create_connector(
    org_id: UUID,
    data: ConnectorCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a new connector (admin only)."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")
    require_org_admin(db, user_id, org_id)

    # Validate connector type
    valid_types = [ConnectorType.JIRA, ConnectorType.CONFLUENCE, ConnectorType.MIRO, ConnectorType.SHAREPOINT]
    if data.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid connector type. Must be one of: {valid_types}")

    connector = Connector(
        organization_id=org_id,
        type=data.type,
        name=data.name,
        created_by=user_id,
    )
    connector.set_config(data.config)

    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector


@router.get("/{connector_id}", response_model=ConnectorWithConfig)
def get_connector(
    connector_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get a connector with its config (admin only)."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    require_org_admin(db, user_id, connector.organization_id)

    return ConnectorWithConfig(
        id=connector.id,
        organization_id=connector.organization_id,
        type=connector.type,
        name=connector.name,
        is_active=connector.is_active,
        created_by=connector.created_by,
        created_at=connector.created_at,
        last_used_at=connector.last_used_at,
        config=connector.get_config(),
    )


@router.put("/{connector_id}", response_model=ConnectorResponse)
def update_connector(
    connector_id: UUID,
    data: ConnectorUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update a connector (admin only)."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    require_org_admin(db, user_id, connector.organization_id)

    if data.name is not None:
        connector.name = data.name
    if data.config is not None:
        connector.set_config(data.config)
    if data.is_active is not None:
        connector.is_active = data.is_active

    db.commit()
    db.refresh(connector)
    return connector


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connector(
    connector_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Delete a connector (admin only)."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    require_org_admin(db, user_id, connector.organization_id)

    db.delete(connector)
    db.commit()


# ============ Test Connection ============

@router.post("/{connector_id}/test", response_model=TestConnectionResult)
def test_connection(
    connector_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Test the connection to an external service."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    require_org_member(db, user_id, connector.organization_id)

    config = connector.get_config()

    # TODO: Implement actual connection testing for each connector type
    # For now, return a mock success response
    if connector.type == ConnectorType.JIRA:
        return TestConnectionResult(
            success=True,
            message="Successfully connected to Jira",
            details={"base_url": config.get("base_url", ""), "project_count": 0}
        )
    elif connector.type == ConnectorType.CONFLUENCE:
        return TestConnectionResult(
            success=True,
            message="Successfully connected to Confluence",
            details={"base_url": config.get("base_url", ""), "space_count": 0}
        )
    elif connector.type == ConnectorType.MIRO:
        return TestConnectionResult(
            success=True,
            message="Successfully connected to Miro",
            details={"board_count": 0}
        )
    elif connector.type == ConnectorType.SHAREPOINT:
        return TestConnectionResult(
            success=True,
            message="Successfully connected to SharePoint",
            details={"site_url": config.get("site_url", "")}
        )
    else:
        return TestConnectionResult(
            success=False,
            message=f"Unknown connector type: {connector.type}",
            details=None
        )


# ============ Jira Content Browsing ============

@router.get("/{connector_id}/jira/projects", response_model=List[JiraProject])
def list_jira_projects(
    connector_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List Jira projects accessible via the connector."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    if connector.type != ConnectorType.JIRA:
        raise HTTPException(status_code=400, detail="Connector is not a Jira connector")

    require_org_member(db, user_id, connector.organization_id)

    # TODO: Implement actual Jira API call
    # For now, return mock data
    return [
        JiraProject(id="10001", key="DOC", name="Documentation"),
        JiraProject(id="10002", key="DEV", name="Development"),
    ]


@router.get("/{connector_id}/jira/projects/{project_key}/issues", response_model=List[JiraIssue])
def list_jira_issues(
    connector_id: UUID,
    project_key: str,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List Jira issues in a project."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    if connector.type != ConnectorType.JIRA:
        raise HTTPException(status_code=400, detail="Connector is not a Jira connector")

    require_org_member(db, user_id, connector.organization_id)

    # TODO: Implement actual Jira API call with JQL
    # For now, return mock data
    return [
        JiraIssue(
            id="10001",
            key=f"{project_key}-1",
            summary="Sample issue 1",
            type="Story",
            status="To Do",
            description="This is a sample issue description.",
        ),
        JiraIssue(
            id="10002",
            key=f"{project_key}-2",
            summary="Sample issue 2",
            type="Bug",
            status="In Progress",
            description="This is another sample issue.",
        ),
    ]


# ============ Confluence Content Browsing ============

@router.get("/{connector_id}/confluence/spaces", response_model=List[ConfluenceSpace])
def list_confluence_spaces(
    connector_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List Confluence spaces accessible via the connector."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    if connector.type != ConnectorType.CONFLUENCE:
        raise HTTPException(status_code=400, detail="Connector is not a Confluence connector")

    require_org_member(db, user_id, connector.organization_id)

    # TODO: Implement actual Confluence API call
    # For now, return mock data
    return [
        ConfluenceSpace(id="123456", key="DOC", name="Documentation"),
        ConfluenceSpace(id="123457", key="ENG", name="Engineering"),
    ]


@router.get("/{connector_id}/confluence/spaces/{space_key}/pages", response_model=List[ConfluencePage])
def list_confluence_pages(
    connector_id: UUID,
    space_key: str,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List Confluence pages in a space."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    if connector.type != ConnectorType.CONFLUENCE:
        raise HTTPException(status_code=400, detail="Connector is not a Confluence connector")

    require_org_member(db, user_id, connector.organization_id)

    # TODO: Implement actual Confluence API call
    # For now, return mock data
    return [
        ConfluencePage(
            id="456789",
            title="Getting Started Guide",
            space_key=space_key,
            excerpt="This guide helps you get started with...",
        ),
        ConfluencePage(
            id="456790",
            title="API Documentation",
            space_key=space_key,
            excerpt="Complete API reference for...",
        ),
    ]


# ============ Fetch and Import Content ============

@router.get("/{connector_id}/content/{source_type}/{source_id}", response_model=ExternalContent)
def fetch_content(
    connector_id: UUID,
    source_type: str,
    source_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Fetch content from external source for preview."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    require_org_member(db, user_id, connector.organization_id)

    # Update last_used_at
    connector.last_used_at = datetime.utcnow()
    db.commit()

    # TODO: Implement actual content fetching based on source_type
    # For now, return mock data
    return ExternalContent(
        id=source_id,
        title="Sample Content",
        content="This is sample content from the external source. In a real implementation, this would contain the actual Jira issue description, Confluence page content, etc.",
        source_type=source_type,
        source_url=f"https://example.com/{source_type}/{source_id}",
        metadata={"fetched_at": datetime.utcnow().isoformat()},
    )


@router.post("/{connector_id}/import/{document_id}", response_model=ConnectorImportResponse)
def import_content(
    connector_id: UUID,
    document_id: UUID,
    data: ImportContentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Import content from external source into a document."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    require_org_member(db, user_id, connector.organization_id)

    # Update last_used_at
    connector.last_used_at = datetime.utcnow()

    # TODO: Fetch actual content from external source
    imported_content = f"Imported content from {data.source_type}: {data.source_id}"

    # Create import record
    import_record = ConnectorImport(
        connector_id=connector_id,
        document_id=document_id,
        source_type=data.source_type,
        source_id=data.source_id,
        source_url=data.source_url,
        imported_content=imported_content,
    )

    db.add(import_record)
    db.commit()
    db.refresh(import_record)

    return import_record


# ============ Import History ============

@router.get("/{connector_id}/imports", response_model=List[ConnectorImportResponse])
def list_imports(
    connector_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List import history for a connector."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    connector = db.query(Connector).filter(Connector.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    require_org_member(db, user_id, connector.organization_id)

    imports = (
        db.query(ConnectorImport)
        .filter(ConnectorImport.connector_id == connector_id)
        .order_by(ConnectorImport.imported_at.desc())
        .all()
    )

    return imports


@router.get("/document/{document_id}/imports", response_model=List[ConnectorImportResponse])
def list_document_imports(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all imports for a specific document."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check access via organization (through sdlc_project or project)
    if document.sdlc_project:
        org_id = document.sdlc_project.organization_id
        require_org_member(db, user_id, org_id)

    imports = (
        db.query(ConnectorImport)
        .filter(ConnectorImport.document_id == document_id)
        .order_by(ConnectorImport.imported_at.desc())
        .all()
    )

    return imports
