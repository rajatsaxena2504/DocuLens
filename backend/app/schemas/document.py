from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class DocumentCreate(BaseModel):
    project_id: Optional[UUID] = None  # Repository ID (optional in SDLC flow)
    sdlc_project_id: Optional[UUID] = None  # SDLC Project ID
    document_type_id: Optional[UUID] = None
    stage_id: Optional[UUID] = None
    title: str


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


class DocumentSectionCreate(BaseModel):
    section_id: Optional[UUID] = None
    custom_title: Optional[str] = None
    custom_description: Optional[str] = None
    display_order: int


class DocumentSectionUpdate(BaseModel):
    custom_title: Optional[str] = None
    custom_description: Optional[str] = None
    is_included: Optional[bool] = None


class DocumentSectionResponse(BaseModel):
    id: UUID
    section_id: Optional[UUID]
    custom_title: Optional[str]
    custom_description: Optional[str]
    display_order: int
    is_included: bool
    title: str  # Computed property
    description: str  # Computed property
    content: Optional[str] = None  # Latest generated content

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    sdlc_project_id: Optional[UUID] = None
    document_type_id: Optional[UUID]
    stage_id: Optional[UUID] = None
    title: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentWithSections(DocumentResponse):
    sections: list[DocumentSectionResponse]


class SectionReorderRequest(BaseModel):
    section_orders: list[dict]  # [{"id": uuid, "display_order": int}, ...]
