import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models import User, Document, DocumentSection, Project, GeneratedContent, SDLCProject
from app.schemas import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentWithSections,
    DocumentSectionCreate,
    DocumentSectionUpdate,
    DocumentSectionResponse,
    SectionReorderRequest,
)
from app.services.section_suggester import SectionSuggester

router = APIRouter()


def get_section_response(section: DocumentSection) -> dict:
    """Convert DocumentSection to response format with latest content."""
    latest_content = (
        section.generated_content[0].content
        if section.generated_content
        else None
    )

    return {
        'id': section.id,
        'section_id': section.section_id,
        'custom_title': section.custom_title,
        'custom_description': section.custom_description,
        'display_order': section.display_order,
        'is_included': section.is_included,
        'title': section.title,
        'description': section.description,
        'content': latest_content,
    }


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    project_id: uuid.UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents for the current user."""
    query = db.query(Document).filter(Document.user_id == current_user.id)

    if project_id:
        query = query.filter(Document.project_id == project_id)

    documents = query.order_by(Document.updated_at.desc()).all()
    return documents


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    document_data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new document.

    Supports two flows:
    1. SDLC flow: sdlc_project_id is provided (project_id interpreted as sdlc_project_id for backwards compat)
    2. Legacy flow: project_id refers to a repository
    """
    project_id = None
    sdlc_project_id = None
    sdlc_project = None

    # Handle SDLC project flow
    if document_data.sdlc_project_id:
        sdlc_project = db.query(SDLCProject).filter(
            SDLCProject.id == document_data.sdlc_project_id,
            SDLCProject.user_id == current_user.id,
        ).first()
        if not sdlc_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SDLC Project not found",
            )
        sdlc_project_id = document_data.sdlc_project_id
    elif document_data.project_id:
        # First try as SDLC project ID (for backwards compatibility with frontend)
        sdlc_project = db.query(SDLCProject).filter(
            SDLCProject.id == document_data.project_id,
            SDLCProject.user_id == current_user.id,
        ).first()
        if sdlc_project:
            sdlc_project_id = document_data.project_id
        else:
            # Fall back to repository (Project) lookup
            project = db.query(Project).filter(
                Project.id == document_data.project_id,
                Project.user_id == current_user.id,
            ).first()
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found",
                )
            project_id = document_data.project_id
            # If repository has an SDLC project, link to that too
            if project.sdlc_project_id:
                sdlc_project_id = project.sdlc_project_id
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either project_id or sdlc_project_id is required",
        )

    # If we have an SDLC project but no repository, try to find one
    # (needed for DB constraint - project_id is NOT NULL in legacy schema)
    if sdlc_project_id and not project_id:
        # Re-fetch sdlc_project if needed
        if not sdlc_project:
            sdlc_project = db.query(SDLCProject).filter(
                SDLCProject.id == sdlc_project_id,
            ).first()
        # Use the first repository from the SDLC project
        if sdlc_project and sdlc_project.repositories:
            project_id = sdlc_project.repositories[0].id

    # If still no project_id, we need at least one repository
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please add a repository to this project before creating documents",
        )

    document = Document(
        project_id=project_id,
        sdlc_project_id=sdlc_project_id,
        document_type_id=document_data.document_type_id,
        stage_id=document_data.stage_id,
        user_id=current_user.id,
        title=document_data.title,
        status="draft",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


@router.get("/{document_id}", response_model=DocumentWithSections)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get document with all sections."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Build response with sections
    sections = [get_section_response(s) for s in document.sections]

    return {
        'id': document.id,
        'project_id': document.project_id,
        'sdlc_project_id': document.sdlc_project_id,
        'document_type_id': document.document_type_id,
        'stage_id': document.stage_id,
        'title': document.title,
        'status': document.status,
        'created_at': document.created_at,
        'updated_at': document.updated_at,
        'sections': sections,
    }


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: uuid.UUID,
    document_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update document metadata."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if document_data.title is not None:
        document.title = document_data.title
    if document_data.status is not None:
        document.status = document_data.status

    db.commit()
    db.refresh(document)

    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    db.delete(document)
    db.commit()


@router.get("/{document_id}/suggestions")
def get_section_suggestions(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-powered section suggestions for a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if not document.document_type_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document type must be set to get suggestions",
        )

    # Get all repositories from SDLC project or fallback to single project
    repositories = []
    if document.sdlc_project_id and document.sdlc_project:
        repositories = list(document.sdlc_project.repositories)
    elif document.project:
        # Check if primary project has SDLC project
        if document.project.sdlc_project_id and document.project.sdlc_project:
            repositories = list(document.project.sdlc_project.repositories)
        else:
            repositories = [document.project]

    if not repositories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No repositories found for this document",
        )

    # Check that at least one repository has analysis data
    analyzed_repos = [r for r in repositories if r.analysis_data]
    if not analyzed_repos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repositories must be analyzed first",
        )

    # Aggregate analysis data from all repositories
    aggregated_analysis = _aggregate_repository_analysis(analyzed_repos)

    suggester = SectionSuggester(db)

    try:
        suggestions = suggester.suggest_sections(
            document_type_id=str(document.document_type_id),
            code_analysis=aggregated_analysis,
        )
        return suggestions
    except Exception as e:
        # Fallback: return default sections from template when AI fails
        print(f"AI suggestion failed, using template defaults: {e}")
        return suggester.get_default_sections(str(document.document_type_id))


def _aggregate_repository_analysis(repositories: list) -> dict:
    """Aggregate analysis data from multiple repositories."""
    if len(repositories) == 1:
        return repositories[0].analysis_data

    aggregated = {
        'is_multi_repo': True,
        'repositories': [],
        'languages': {},
        'file_tree': [],
        'config_files': [],
        'entry_points': [],
        'key_files': [],
        'structure': {
            'total_files': 0,
            'total_dirs': 0,
            'total_lines': 0,
        },
        'dependencies': {},
        'primary_language': None,
    }

    for repo in repositories:
        analysis = repo.analysis_data or {}
        repo_info = {
            'name': repo.name,
            'type': repo.repo_type or 'unknown',
            'primary_language': analysis.get('primary_language'),
        }
        aggregated['repositories'].append(repo_info)

        # Aggregate languages
        if analysis.get('languages'):
            for lang, count in analysis['languages'].items():
                aggregated['languages'][lang] = aggregated['languages'].get(lang, 0) + count

        # Aggregate structure
        if analysis.get('structure'):
            structure = analysis['structure']
            aggregated['structure']['total_files'] += structure.get('total_files', 0)
            aggregated['structure']['total_dirs'] += structure.get('total_dirs', 0)
            aggregated['structure']['total_lines'] += structure.get('total_lines', 0)

        # Aggregate file trees with repo prefix
        if analysis.get('file_tree'):
            for path in analysis['file_tree']:
                aggregated['file_tree'].append(f"{repo.name}/{path}")

        # Aggregate config files
        if analysis.get('config_files'):
            for config in analysis['config_files']:
                aggregated['config_files'].append(f"{repo.name}/{config}")

        # Aggregate entry points
        if analysis.get('entry_points'):
            aggregated['entry_points'].extend(analysis['entry_points'])

        # Aggregate key files
        if analysis.get('key_files'):
            for kf in analysis['key_files']:
                kf_copy = dict(kf)
                kf_copy['path'] = f"{repo.name}/{kf['path']}"
                kf_copy['repository'] = repo.name
                aggregated['key_files'].append(kf_copy)

        # Aggregate dependencies
        if analysis.get('dependencies'):
            aggregated['dependencies'][repo.name] = analysis['dependencies']

    # Determine primary language from aggregated data
    if aggregated['languages']:
        aggregated['primary_language'] = max(aggregated['languages'], key=aggregated['languages'].get)

    return aggregated


@router.get("/{document_id}/sections")
def get_document_sections(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current sections for a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return [get_section_response(s) for s in document.sections]


@router.post("/{document_id}/sections", response_model=DocumentSectionResponse)
def add_document_section(
    document_id: uuid.UUID,
    section_data: DocumentSectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a section to a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    section = DocumentSection(
        document_id=document_id,
        section_id=section_data.section_id,
        custom_title=section_data.custom_title,
        custom_description=section_data.custom_description,
        display_order=section_data.display_order,
    )

    db.add(section)
    db.commit()
    db.refresh(section)

    return get_section_response(section)


@router.put("/{document_id}/sections/{section_id}")
def update_document_section(
    document_id: uuid.UUID,
    section_id: uuid.UUID,
    section_data: DocumentSectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a document section."""
    section = db.query(DocumentSection).join(Document).filter(
        DocumentSection.id == section_id,
        DocumentSection.document_id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    if section_data.custom_title is not None:
        section.custom_title = section_data.custom_title
    if section_data.custom_description is not None:
        section.custom_description = section_data.custom_description
    if section_data.is_included is not None:
        section.is_included = section_data.is_included

    db.commit()
    db.refresh(section)

    return get_section_response(section)


@router.delete("/{document_id}/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document_section(
    document_id: uuid.UUID,
    section_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a section from a document."""
    section = db.query(DocumentSection).join(Document).filter(
        DocumentSection.id == section_id,
        DocumentSection.document_id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    db.delete(section)
    db.commit()


@router.post("/{document_id}/sections/reorder")
def reorder_sections(
    document_id: uuid.UUID,
    reorder_data: SectionReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder sections in a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Update display_order for each section
    for item in reorder_data.section_orders:
        section = db.query(DocumentSection).filter(
            DocumentSection.id == item['id'],
            DocumentSection.document_id == document_id,
        ).first()

        if section:
            section.display_order = item['display_order']

    db.commit()

    return {"message": "Sections reordered successfully"}


@router.put("/{document_id}/sections/{section_id}/content")
def update_section_content(
    document_id: uuid.UUID,
    section_id: uuid.UUID,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually update section content."""
    section = db.query(DocumentSection).join(Document).filter(
        DocumentSection.id == section_id,
        DocumentSection.document_id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Section not found",
        )

    # Get current max version
    current_max = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.document_section_id == section_id)
        .order_by(GeneratedContent.version.desc())
        .first()
    )

    new_version = (current_max.version + 1) if current_max else 1

    generated = GeneratedContent(
        document_section_id=section_id,
        content=content,
        version=new_version,
        is_ai_generated=False,
    )

    db.add(generated)
    db.commit()

    return get_section_response(section)
