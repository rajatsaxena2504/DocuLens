import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models import User, Section
from app.schemas import SectionCreate, SectionResponse

router = APIRouter()


@router.get("", response_model=List[SectionResponse])
def list_sections(
    doc_type: uuid.UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all available sections."""
    query = db.query(Section).filter(
        (Section.is_system == True) | (Section.user_id == current_user.id)
    )

    if doc_type:
        # Filter by applicable document type
        query = query.filter(Section.applicable_doc_types.contains([doc_type]))

    sections = query.order_by(Section.default_order).all()
    return sections


@router.post("", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
def create_section(
    section_data: SectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a custom section."""
    section = Section(
        name=section_data.name,
        description=section_data.description,
        default_order=section_data.default_order,
        applicable_doc_types=section_data.applicable_doc_types,
        is_system=False,
        user_id=current_user.id,
    )

    db.add(section)
    db.commit()
    db.refresh(section)

    return section


@router.get("/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific section."""
    section = db.query(Section).filter(
        Section.id == section_id,
        (Section.is_system == True) | (Section.user_id == current_user.id),
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    return section


@router.patch("/{section_id}/description", response_model=SectionResponse)
def update_section_description(
    section_id: uuid.UUID,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a section's description (for central template library editing)."""
    section = db.query(Section).filter(
        Section.id == section_id,
        (Section.is_system == True) | (Section.user_id == current_user.id),
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    description = data.get("description")
    if description is not None:
        section.description = description
        db.commit()
        db.refresh(section)

    return section


@router.get("/library/with-templates", response_model=List[dict])
def list_sections_with_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sections with their template usage info for the section library."""
    from app.models import DocumentType, DocumentTypeSection

    sections = db.query(Section).filter(
        (Section.is_system == True) | (Section.user_id == current_user.id)
    ).order_by(Section.name).all()

    result = []
    for section in sections:
        # Get templates that use this section
        template_mappings = (
            db.query(DocumentTypeSection)
            .filter(DocumentTypeSection.section_id == section.id)
            .all()
        )

        templates_using = []
        for mapping in template_mappings:
            template = db.query(DocumentType).filter(
                DocumentType.id == mapping.document_type_id
            ).first()
            if template:
                templates_using.append({
                    "id": str(template.id),
                    "name": template.name,
                    "stage": template.stage.name if template.stage else None,
                })

        result.append({
            "id": str(section.id),
            "name": section.name,
            "description": section.description,
            "default_order": section.default_order,
            "is_system": section.is_system,
            "created_at": section.created_at.isoformat() if section.created_at else None,
            "templates_using": templates_using,
            "template_count": len(templates_using),
        })

    return result


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    section_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom section."""
    section = db.query(Section).filter(
        Section.id == section_id,
        Section.user_id == current_user.id,
        Section.is_system == False,
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found or cannot be deleted",
        )

    db.delete(section)
    db.commit()
