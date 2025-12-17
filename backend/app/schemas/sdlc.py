from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, HttpUrl


# ============ SDLC Stage Schemas ============

class SDLCStageResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    display_order: int
    icon: Optional[str]
    color: Optional[str]

    class Config:
        from_attributes = True


# ============ Repository Schemas ============

class RepositoryCreate(BaseModel):
    github_url: HttpUrl
    name: Optional[str] = None
    description: Optional[str] = None
    repo_type: Optional[str] = None  # 'frontend', 'backend', 'api', etc.


class RepositoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    repo_type: Optional[str] = None


class RepositoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    source_type: str
    repo_type: Optional[str]
    github_url: Optional[str]
    analysis_data: Optional[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ SDLC Project Schemas ============

class SDLCProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class SDLCProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # 'active', 'archived'


class SDLCProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SDLCProjectWithRepositories(SDLCProjectResponse):
    repositories: List[RepositoryResponse] = []


class SDLCProjectDetail(SDLCProjectWithRepositories):
    """Full project detail including document counts per stage"""
    stage_document_counts: Optional[dict[str, int]] = None


# ============ Document Creation in Stage Context ============

class StageDocumentCreate(BaseModel):
    """Create a document within an SDLC stage context"""
    project_id: UUID  # The repository to analyze
    document_type_id: Optional[UUID] = None
    title: str
    stage_id: UUID


# ============ Stage with Documents ============

class StageWithDocuments(SDLCStageResponse):
    """Stage with its documents for a given project"""
    documents: List[Any] = []  # Will be DocumentResponse, avoiding circular import
    document_count: int = 0
