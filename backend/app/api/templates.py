import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from app.api.deps import get_db, get_current_user
from app.models import User, DocumentType, DocumentTypeSection, OrganizationMember, Section
from app.schemas import (
    DocumentTypeCreate,
    DocumentTypeResponse,
    DocumentTypeWithSections,
    SectionResponse,
)


class AddSectionToTemplateRequest(BaseModel):
    section_id: uuid.UUID
    order: Optional[int] = None


class ReorderTemplateSectionsRequest(BaseModel):
    section_ids: List[uuid.UUID]

router = APIRouter()


def _get_user_org_admin_ids(db: Session, user_id: uuid.UUID) -> List[uuid.UUID]:
    """Get organization IDs where user is an owner."""
    memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user_id,
        OrganizationMember.is_owner == True
    ).all()
    return [m.organization_id for m in memberships]


def _get_user_org_ids(db: Session, user_id: uuid.UUID) -> List[uuid.UUID]:
    """Get all organization IDs user belongs to."""
    memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user_id
    ).all()
    return [m.organization_id for m in memberships]


@router.get("", response_model=List[DocumentTypeResponse])
def list_templates(
    stage_id: uuid.UUID = None,
    scope: Optional[str] = Query(None, description="Filter by scope: system, org, or all"),
    organization_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all document types/templates, optionally filtered by stage and scope."""
    user_org_ids = _get_user_org_ids(db, current_user.id)

    if scope == 'system':
        # Only system templates
        query = db.query(DocumentType).filter(DocumentType.is_system == True)
    elif scope == 'org':
        # Only organization templates
        if organization_id:
            query = db.query(DocumentType).filter(
                DocumentType.organization_id == organization_id,
                DocumentType.is_system == False
            )
        else:
            query = db.query(DocumentType).filter(
                DocumentType.organization_id.in_(user_org_ids),
                DocumentType.is_system == False
            )
    else:
        # All accessible templates
        query = db.query(DocumentType).filter(
            or_(
                DocumentType.is_system == True,
                DocumentType.user_id == current_user.id,
                DocumentType.organization_id.in_(user_org_ids) if user_org_ids else False
            )
        )

    if stage_id:
        query = query.filter(DocumentType.stage_id == stage_id)

    templates = query.all()
    return templates


@router.get("/library/with-sections", response_model=List[dict])
def list_templates_with_sections(
    scope: Optional[str] = Query(None, description="Filter by scope: system, org, or all"),
    organization_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all templates with their sections for the template library view."""
    user_org_ids = _get_user_org_ids(db, current_user.id)

    if scope == 'system':
        # Only system templates
        query = db.query(DocumentType).filter(DocumentType.is_system == True)
    elif scope == 'org':
        # Only organization templates
        if organization_id:
            query = db.query(DocumentType).filter(
                DocumentType.organization_id == organization_id,
                DocumentType.is_system == False
            )
        else:
            query = db.query(DocumentType).filter(
                DocumentType.organization_id.in_(user_org_ids),
                DocumentType.is_system == False
            )
    else:
        # All accessible templates
        query = db.query(DocumentType).filter(
            or_(
                DocumentType.is_system == True,
                DocumentType.user_id == current_user.id,
                DocumentType.organization_id.in_(user_org_ids) if user_org_ids else False
            )
        )

    templates = query.all()

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
            "is_org_default": getattr(template, 'is_org_default', False),
            "organization_id": str(template.organization_id) if template.organization_id else None,
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
    organization_id: Optional[uuid.UUID] = None,
    stage_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a custom document type/template.

    If organization_id is provided and user is an owner, creates org-level template.
    Otherwise creates personal template.
    """
    org_id = None
    if organization_id:
        # Check if user is owner of the organization
        owner_org_ids = _get_user_org_admin_ids(db, current_user.id)
        if organization_id in owner_org_ids:
            org_id = organization_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners can create org-level templates",
            )

    template = DocumentType(
        name=template_data.name,
        description=template_data.description,
        is_system=False,
        user_id=current_user.id,
        organization_id=org_id,
        stage_id=stage_id,
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
    # Get user's admin orgs
    admin_org_ids = _get_user_org_admin_ids(db, current_user.id)

    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        DocumentType.is_system == False,
        or_(
            DocumentType.user_id == current_user.id,
            DocumentType.organization_id.in_(admin_org_ids) if admin_org_ids else False
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or cannot be deleted",
        )

    db.delete(template)
    db.commit()


@router.post("/{template_id}/set-default")
def set_template_default(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a template as organization default (owner only)."""
    owner_org_ids = _get_user_org_admin_ids(db, current_user.id)

    if not owner_org_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization owners can set default templates",
        )

    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        or_(
            DocumentType.is_system == True,
            DocumentType.organization_id.in_(owner_org_ids)
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Toggle the default status
    template.is_org_default = not template.is_org_default
    db.commit()

    return {
        'id': str(template.id),
        'is_org_default': template.is_org_default,
        'message': 'Template default status updated'
    }


@router.put("/{template_id}")
def update_template(
    template_id: uuid.UUID,
    name: Optional[str] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an organization template (owner only)."""
    owner_org_ids = _get_user_org_admin_ids(db, current_user.id)

    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        DocumentType.is_system == False,
        or_(
            DocumentType.user_id == current_user.id,
            DocumentType.organization_id.in_(owner_org_ids) if owner_org_ids else False
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or cannot be updated",
        )

    if name is not None:
        template.name = name
    if description is not None:
        template.description = description

    db.commit()
    db.refresh(template)

    return template


# ============ Template Section Management ============

def _can_edit_template(db: Session, template_id: uuid.UUID, user: User) -> DocumentType:
    """Check if user can edit this template and return it."""
    owner_org_ids = _get_user_org_admin_ids(db, user.id)

    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        DocumentType.is_system == False,
        or_(
            DocumentType.user_id == user.id,
            DocumentType.organization_id.in_(owner_org_ids) if owner_org_ids else False
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or you don't have permission to edit it",
        )

    return template


@router.get("/{template_id}/sections")
def list_template_sections(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sections in a template."""
    user_org_ids = _get_user_org_ids(db, current_user.id)

    # Check access to template
    template = db.query(DocumentType).filter(
        DocumentType.id == template_id,
        or_(
            DocumentType.is_system == True,
            DocumentType.user_id == current_user.id,
            DocumentType.organization_id.in_(user_org_ids) if user_org_ids else False
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    mappings = (
        db.query(DocumentTypeSection)
        .filter(DocumentTypeSection.document_type_id == template_id)
        .order_by(DocumentTypeSection.default_order)
        .all()
    )

    return [
        {
            "id": str(m.section.id),
            "name": m.section.name,
            "description": m.section.description,
            "default_order": m.default_order,
            "is_system": m.section.is_system,
        }
        for m in mappings
    ]


@router.post("/{template_id}/sections")
def add_section_to_template(
    template_id: uuid.UUID,
    data: AddSectionToTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a section to a template."""
    template = _can_edit_template(db, template_id, current_user)

    # Check if section exists
    section = db.query(Section).filter(Section.id == data.section_id).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Check if already added
    existing = db.query(DocumentTypeSection).filter(
        DocumentTypeSection.document_type_id == template_id,
        DocumentTypeSection.section_id == data.section_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Section already exists in this template",
        )

    # Get next order if not specified
    if data.order is None:
        max_order = db.query(DocumentTypeSection).filter(
            DocumentTypeSection.document_type_id == template_id
        ).count()
        order = max_order + 1
    else:
        order = data.order

    mapping = DocumentTypeSection(
        document_type_id=template_id,
        section_id=data.section_id,
        default_order=order,
    )

    db.add(mapping)
    db.commit()

    return {
        "message": "Section added to template",
        "section_id": str(data.section_id),
        "order": order,
    }


@router.delete("/{template_id}/sections/{section_id}")
def remove_section_from_template(
    template_id: uuid.UUID,
    section_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a section from a template."""
    template = _can_edit_template(db, template_id, current_user)

    mapping = db.query(DocumentTypeSection).filter(
        DocumentTypeSection.document_type_id == template_id,
        DocumentTypeSection.section_id == section_id,
    ).first()

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found in this template",
        )

    db.delete(mapping)
    db.commit()

    return {"message": "Section removed from template"}


@router.post("/{template_id}/sections/reorder")
def reorder_template_sections(
    template_id: uuid.UUID,
    data: ReorderTemplateSectionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder sections in a template."""
    template = _can_edit_template(db, template_id, current_user)

    for index, section_id in enumerate(data.section_ids):
        mapping = db.query(DocumentTypeSection).filter(
            DocumentTypeSection.document_type_id == template_id,
            DocumentTypeSection.section_id == section_id,
        ).first()

        if mapping:
            mapping.default_order = index + 1

    db.commit()

    return {"message": "Sections reordered"}
