from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel


# ============ Connector Types ============

class ConnectorType:
    JIRA = "jira"
    CONFLUENCE = "confluence"
    MIRO = "miro"
    SHAREPOINT = "sharepoint"


# ============ Request Schemas ============

class ConnectorCreate(BaseModel):
    type: str  # jira, confluence, miro, sharepoint
    name: str
    config: Dict[str, Any]  # Connection configuration


class ConnectorUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ImportContentRequest(BaseModel):
    source_type: str  # jira_issue, confluence_page, miro_board, sharepoint_doc
    source_id: str
    source_url: Optional[str] = None


# ============ Response Schemas ============

class ConnectorResponse(BaseModel):
    id: UUID
    organization_id: UUID
    type: str
    name: str
    is_active: bool
    created_by: Optional[UUID] = None
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConnectorWithConfig(ConnectorResponse):
    """Response including config (for admins only)."""
    config: Dict[str, Any]


class ConnectorImportResponse(BaseModel):
    id: UUID
    connector_id: UUID
    document_id: UUID
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    source_url: Optional[str] = None
    imported_at: datetime

    class Config:
        from_attributes = True


class TestConnectionResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# ============ Jira-specific Schemas ============

class JiraProject(BaseModel):
    id: str
    key: str
    name: str


class JiraIssue(BaseModel):
    id: str
    key: str
    summary: str
    type: str
    status: str
    description: Optional[str] = None


# ============ Confluence-specific Schemas ============

class ConfluenceSpace(BaseModel):
    id: str
    key: str
    name: str


class ConfluencePage(BaseModel):
    id: str
    title: str
    space_key: str
    excerpt: Optional[str] = None


# ============ Generic Content Schemas ============

class ExternalContent(BaseModel):
    """Generic content fetched from external source."""
    id: str
    title: str
    content: str
    source_type: str
    source_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
