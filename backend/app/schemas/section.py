from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class SectionCreate(BaseModel):
    name: str
    description: str
    default_order: Optional[int] = None
    applicable_doc_types: Optional[list[UUID]] = None


class SectionResponse(BaseModel):
    id: UUID
    name: str
    description: str
    default_order: Optional[int]
    is_system: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DocumentTypeResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    is_system: bool
    stage_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentTypeWithSections(DocumentTypeResponse):
    default_sections: list[SectionResponse]


class SectionSuggestion(BaseModel):
    section_id: Optional[UUID]
    name: str
    description: str
    relevance_score: float
    reason: str
    is_custom: bool = False
