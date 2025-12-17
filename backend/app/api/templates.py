import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models import User, DocumentType, DocumentTypeSection
from app.schemas import (
    DocumentTypeCreate,
    DocumentTypeResponse,
    DocumentTypeWithSections,
    SectionResponse,
)

router = APIRouter()


@router.get("", response_model=List[DocumentTypeResponse])
def list_templates(
    stage_id: uuid.UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all document types/templates, optionally filtered by stage."""
    query = db.query(DocumentType).filter(
        (DocumentType.is_system == True) | (DocumentType.user_id == current_user.id)
    )

    if stage_id:
        query = query.filter(DocumentType.stage_id == stage_id)

    templates = query.all()
    return templates


@router.get("/library/with-sections", response_model=List[dict])
def list_templates_with_sections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all templates with their sections for the template library view."""
    templates = db.query(DocumentType).filter(
        (DocumentType.is_system == True) | (DocumentType.user_id == current_user.id)
    ).all()

    result = []
    for template in templates:
        # Get sections for this template
        mappings = (
            db.query(DocumentTypeSection)
            .filter(DocumentTypeSection.document_type_id == template.id)
            .order_by(DocumentTypeSection.default_order)
            .all()
        )

        sections = [
            {
                "id": str(m.section.id),
                "name": m.section.name,
                "description": m.section.description,
                "default_order": m.default_order,
                "is_system": m.section.is_system,
            }
            for m in mappings
        ]

        result.append({
            "id": str(template.id),
            "name": template.name,
            "description": template.description,
            "stage": template.stage.name if template.stage else None,
            "is_system": template.is_system,
            "created_at": template.created_at.isoformat() if template.created_at else None,
            "sections": sections,
        })

    return result


@router.get("/by-stage/{stage_id}", response_model=List[DocumentTypeResponse])
def list_templates_by_stage(
    stage_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List document types/templates for a specific SDLC stage."""
    templates = db.query(DocumentType).filter(
        DocumentType.stage_id == stage_id,
        (DocumentType.is_system == True) | (DocumentType.user_id == current_user.id)
    ).all()
    return templates


@router.post("", response_model=DocumentTypeResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    template_data: DocumentTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a custom document type/template."""
    template = DocumentType(
        name=template_data.name,
        description=template_data.description,
        is_system=False,
        user_id=current_user.id,
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return template


@router.get("/{template_id}", response_model=DocumentTypeWithSections)
def get_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a template with its default sections."""
    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        (DocumentType.is_system == True) | (DocumentType.user_id == current_user.id),
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Get default sections
    mappings = (
        db.query(DocumentTypeSection)
        .filter(DocumentTypeSection.document_type_id == template_id)
        .order_by(DocumentTypeSection.default_order)
        .all()
    )

    sections = [
        SectionResponse(
            id=m.section.id,
            name=m.section.name,
            description=m.section.description,
            default_order=m.default_order,
            is_system=m.section.is_system,
            created_at=m.section.created_at,
        )
        for m in mappings
    ]

    return {
        'id': template.id,
        'name': template.name,
        'description': template.description,
        'is_system': template.is_system,
        'created_at': template.created_at,
        'default_sections': sections,
    }


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom template."""
    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        DocumentType.user_id == current_user.id,
        DocumentType.is_system == False,
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or cannot be deleted",
        )

    db.delete(template)
    db.commit()
