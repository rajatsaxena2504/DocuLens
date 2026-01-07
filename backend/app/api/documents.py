import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models import User, Document, DocumentSection, Project, GeneratedContent, SDLCProject, DocumentVersion, DocumentReview, ReviewComment
from app.schemas import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentWithSections,
    DocumentSectionCreate,
    DocumentSectionUpdate,
    DocumentSectionResponse,
    SectionReorderRequest,
    DocumentVersionCreate,
    DocumentVersionResponse,
    DocumentVersionDetail,
    DocumentVersionList,
    VersionComparisonRequest,
    VersionComparisonResponse,
    RestoreVersionRequest,
    SubmitForReviewRequest,
    AssignReviewerRequest,
    SubmitReviewRequest,
    ReviewStatusResponse,
    DocumentReviewResponse,
    DocumentReviewSummary,
)
from app.services.section_suggester import SectionSuggester
from datetime import datetime

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


# ============ Version Management Endpoints ============


def _create_document_snapshot(document: Document) -> dict:
    """Create a snapshot of the document's current state."""
    sections_snapshot = []
    for section in document.sections:
        latest_content = (
            section.generated_content[0].content
            if section.generated_content
            else None
        )
        sections_snapshot.append({
            'section_id': str(section.id),
            'library_section_id': str(section.section_id) if section.section_id else None,
            'custom_title': section.custom_title,
            'custom_description': section.custom_description,
            'display_order': section.display_order,
            'is_included': section.is_included,
            'title': section.title,
            'description': section.description,
            'content': latest_content,
        })

    return {
        'title': document.title,
        'status': document.status,
        'document_type_id': str(document.document_type_id) if document.document_type_id else None,
        'stage_id': str(document.stage_id) if document.stage_id else None,
        'sections': sections_snapshot,
    }


@router.get("/{document_id}/versions", response_model=DocumentVersionList)
def list_document_versions(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all versions of a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    versions = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).all()

    version_responses = []
    for v in versions:
        creator_name = None
        if v.creator:
            creator_name = v.creator.name or v.creator.email
        version_responses.append({
            'id': v.id,
            'document_id': v.document_id,
            'version_number': v.version_number,
            'change_summary': v.change_summary,
            'created_by': v.created_by,
            'created_at': v.created_at,
            'creator_name': creator_name,
        })

    return {
        'versions': version_responses,
        'total': len(versions),
        'current_version': document.current_version or 1,
    }


@router.post("/{document_id}/versions", response_model=DocumentVersionResponse, status_code=status.HTTP_201_CREATED)
def create_document_version(
    document_id: uuid.UUID,
    version_data: DocumentVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new version snapshot of the document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Get next version number
    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).first()

    next_version = (latest_version.version_number + 1) if latest_version else 1

    # Create snapshot
    snapshot = _create_document_snapshot(document)

    version = DocumentVersion(
        document_id=document_id,
        version_number=next_version,
        snapshot=snapshot,
        change_summary=version_data.change_summary,
        created_by=current_user.id,
    )

    db.add(version)

    # Update document's current version
    document.current_version = next_version

    db.commit()
    db.refresh(version)

    creator_name = current_user.name or current_user.email

    return {
        'id': version.id,
        'document_id': version.document_id,
        'version_number': version.version_number,
        'change_summary': version.change_summary,
        'created_by': version.created_by,
        'created_at': version.created_at,
        'creator_name': creator_name,
    }


@router.get("/{document_id}/versions/{version_number}", response_model=DocumentVersionDetail)
def get_document_version(
    document_id: uuid.UUID,
    version_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific version of a document with full snapshot."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == version_number,
    ).first()

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_number} not found",
        )

    creator_name = None
    if version.creator:
        creator_name = version.creator.name or version.creator.email

    return {
        'id': version.id,
        'document_id': version.document_id,
        'version_number': version.version_number,
        'snapshot': version.snapshot,
        'change_summary': version.change_summary,
        'created_by': version.created_by,
        'created_at': version.created_at,
        'creator_name': creator_name,
    }


@router.post("/{document_id}/versions/compare", response_model=VersionComparisonResponse)
def compare_versions(
    document_id: uuid.UUID,
    comparison: VersionComparisonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare two versions of a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Get both versions
    from_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == comparison.from_version,
    ).first()

    to_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == comparison.to_version,
    ).first()

    if not from_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {comparison.from_version} not found",
        )

    if not to_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {comparison.to_version} not found",
        )

    # Build section maps for comparison
    from_sections = {s['section_id']: s for s in from_version.snapshot.get('sections', [])}
    to_sections = {s['section_id']: s for s in to_version.snapshot.get('sections', [])}

    section_diffs = []
    all_section_ids = set(from_sections.keys()) | set(to_sections.keys())

    added_count = 0
    removed_count = 0
    modified_count = 0

    for section_id in all_section_ids:
        from_section = from_sections.get(section_id)
        to_section = to_sections.get(section_id)

        if from_section and to_section:
            # Section exists in both - check for modifications
            if from_section.get('content') != to_section.get('content'):
                section_diffs.append({
                    'section_id': uuid.UUID(section_id),
                    'section_title': to_section.get('title', 'Untitled'),
                    'change_type': 'modified',
                    'old_content': from_section.get('content'),
                    'new_content': to_section.get('content'),
                })
                modified_count += 1
            else:
                section_diffs.append({
                    'section_id': uuid.UUID(section_id),
                    'section_title': to_section.get('title', 'Untitled'),
                    'change_type': 'unchanged',
                    'old_content': from_section.get('content'),
                    'new_content': to_section.get('content'),
                })
        elif from_section:
            # Section was removed
            section_diffs.append({
                'section_id': uuid.UUID(section_id),
                'section_title': from_section.get('title', 'Untitled'),
                'change_type': 'removed',
                'old_content': from_section.get('content'),
                'new_content': None,
            })
            removed_count += 1
        else:
            # Section was added
            section_diffs.append({
                'section_id': uuid.UUID(section_id),
                'section_title': to_section.get('title', 'Untitled'),
                'change_type': 'added',
                'old_content': None,
                'new_content': to_section.get('content'),
            })
            added_count += 1

    # Generate summary
    summary_parts = []
    if added_count:
        summary_parts.append(f"{added_count} section(s) added")
    if removed_count:
        summary_parts.append(f"{removed_count} section(s) removed")
    if modified_count:
        summary_parts.append(f"{modified_count} section(s) modified")

    summary = ", ".join(summary_parts) if summary_parts else "No changes"

    return {
        'document_id': document_id,
        'from_version': comparison.from_version,
        'to_version': comparison.to_version,
        'from_timestamp': from_version.created_at,
        'to_timestamp': to_version.created_at,
        'section_diffs': section_diffs,
        'summary': summary,
    }


@router.post("/{document_id}/versions/restore", response_model=DocumentVersionResponse)
def restore_version(
    document_id: uuid.UUID,
    restore_data: RestoreVersionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restore a document to a specific version (creates a new version)."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Get the version to restore
    version_to_restore = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == restore_data.version_number,
    ).first()

    if not version_to_restore:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {restore_data.version_number} not found",
        )

    snapshot = version_to_restore.snapshot

    # Update document metadata
    document.title = snapshot.get('title', document.title)
    document.status = snapshot.get('status', document.status)

    # Delete existing sections
    db.query(DocumentSection).filter(
        DocumentSection.document_id == document_id
    ).delete()

    # Recreate sections from snapshot
    for section_data in snapshot.get('sections', []):
        new_section = DocumentSection(
            document_id=document_id,
            section_id=uuid.UUID(section_data['library_section_id']) if section_data.get('library_section_id') else None,
            custom_title=section_data.get('custom_title'),
            custom_description=section_data.get('custom_description'),
            display_order=section_data.get('display_order', 0),
            is_included=section_data.get('is_included', True),
        )
        db.add(new_section)
        db.flush()

        # Restore content if present
        if section_data.get('content'):
            content = GeneratedContent(
                document_section_id=new_section.id,
                content=section_data['content'],
                version=1,
                is_ai_generated=False,
                modified_by=current_user.id,
                modified_at=datetime.utcnow(),
            )
            db.add(content)

    # Create a new version to record the restore
    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).first()

    next_version = (latest_version.version_number + 1) if latest_version else 1

    change_summary = restore_data.change_summary or f"Restored to version {restore_data.version_number}"

    new_version = DocumentVersion(
        document_id=document_id,
        version_number=next_version,
        snapshot=snapshot,  # Same snapshot as restored version
        change_summary=change_summary,
        created_by=current_user.id,
    )

    db.add(new_version)
    document.current_version = next_version

    db.commit()
    db.refresh(new_version)

    creator_name = current_user.name or current_user.email

    return {
        'id': new_version.id,
        'document_id': new_version.document_id,
        'version_number': new_version.version_number,
        'change_summary': new_version.change_summary,
        'created_by': new_version.created_by,
        'created_at': new_version.created_at,
        'creator_name': creator_name,
    }


# ============ Review Workflow Endpoints ============


def _get_reviewer_info(user: User) -> dict:
    """Convert user to reviewer info dict."""
    if not user:
        return None
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
    }


def _get_review_summary(review: DocumentReview) -> dict:
    """Convert review to summary dict."""
    return {
        'id': review.id,
        'document_id': review.document_id,
        'reviewer_id': review.reviewer_id,
        'version_number': review.version_number,
        'status': review.status,
        'overall_comment': review.overall_comment,
        'reviewed_at': review.reviewed_at,
        'reviewer': _get_reviewer_info(review.reviewer) if review.reviewer else None,
        'comment_count': len(review.comments),
        'unresolved_count': sum(1 for c in review.comments if not c.is_resolved),
    }


@router.get("/{document_id}/review-status", response_model=ReviewStatusResponse)
def get_review_status(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current review status of a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Get latest review
    latest_review = db.query(DocumentReview).filter(
        DocumentReview.document_id == document_id
    ).order_by(DocumentReview.reviewed_at.desc()).first()

    # Count pending comments
    pending_comments = 0
    if latest_review:
        pending_comments = sum(1 for c in latest_review.comments if not c.is_resolved)

    total_reviews = db.query(DocumentReview).filter(
        DocumentReview.document_id == document_id
    ).count()

    return {
        'review_status': document.review_status or 'draft',
        'assigned_reviewer': _get_reviewer_info(document.assigned_reviewer) if document.assigned_reviewer else None,
        'submitted_at': document.submitted_at,
        'approved_at': document.approved_at,
        'latest_review': _get_review_summary(latest_review) if latest_review else None,
        'total_reviews': total_reviews,
        'pending_comments': pending_comments,
    }


@router.post("/{document_id}/submit-review")
def submit_for_review(
    document_id: uuid.UUID,
    request: SubmitForReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a document for review."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if document.review_status not in ['draft', 'changes_requested']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit document with status '{document.review_status}'",
        )

    # Assign reviewer if specified
    if request.reviewer_id:
        reviewer = db.query(User).filter(User.id == request.reviewer_id).first()
        if not reviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reviewer not found",
            )
        document.assigned_reviewer_id = request.reviewer_id

    document.review_status = 'pending_review'
    document.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(document)

    return {
        'message': 'Document submitted for review',
        'review_status': document.review_status,
        'submitted_at': document.submitted_at,
    }


@router.post("/{document_id}/assign-reviewer")
def assign_reviewer(
    document_id: uuid.UUID,
    request: AssignReviewerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a reviewer to a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    reviewer = db.query(User).filter(User.id == request.reviewer_id).first()
    if not reviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reviewer not found",
        )

    document.assigned_reviewer_id = request.reviewer_id

    db.commit()
    db.refresh(document)

    return {
        'message': 'Reviewer assigned',
        'assigned_reviewer': _get_reviewer_info(reviewer),
    }


@router.post("/{document_id}/review", response_model=DocumentReviewResponse)
def submit_review(
    document_id: uuid.UUID,
    request: SubmitReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a review for a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if document.review_status != 'pending_review':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not pending review",
        )

    # Validate status
    valid_statuses = ['approved', 'rejected', 'changes_requested']
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review status. Must be one of: {', '.join(valid_statuses)}",
        )

    # Create the review
    review = DocumentReview(
        document_id=document_id,
        reviewer_id=current_user.id,
        version_number=document.current_version,
        status=request.status,
        overall_comment=request.overall_comment,
    )
    db.add(review)
    db.flush()

    # Add comments if provided
    if request.comments:
        for comment_data in request.comments:
            comment = ReviewComment(
                review_id=review.id,
                document_section_id=comment_data.document_section_id,
                comment=comment_data.comment,
                created_by=current_user.id,
            )
            db.add(comment)

    # Update document status based on review decision
    if request.status == 'approved':
        document.review_status = 'approved'
        document.approved_at = datetime.utcnow()
    elif request.status == 'changes_requested':
        document.review_status = 'changes_requested'
    elif request.status == 'rejected':
        document.review_status = 'draft'  # Reset to draft on rejection

    db.commit()
    db.refresh(review)

    # Build response
    comments_response = []
    for c in review.comments:
        section_title = None
        if c.section:
            section_title = c.section.title
        comments_response.append({
            'id': c.id,
            'review_id': c.review_id,
            'document_section_id': c.document_section_id,
            'comment': c.comment,
            'is_resolved': c.is_resolved,
            'resolved_by': c.resolved_by,
            'resolved_at': c.resolved_at,
            'created_by': c.created_by,
            'created_at': c.created_at,
            'creator': _get_reviewer_info(c.creator) if c.creator else None,
            'section_title': section_title,
        })

    return {
        'id': review.id,
        'document_id': review.document_id,
        'reviewer_id': review.reviewer_id,
        'version_number': review.version_number,
        'status': review.status,
        'overall_comment': review.overall_comment,
        'reviewed_at': review.reviewed_at,
        'reviewer': _get_reviewer_info(review.reviewer),
        'comments': comments_response,
    }


@router.get("/{document_id}/reviews", response_model=List[DocumentReviewSummary])
def list_reviews(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all reviews for a document."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    reviews = db.query(DocumentReview).filter(
        DocumentReview.document_id == document_id
    ).order_by(DocumentReview.reviewed_at.desc()).all()

    return [_get_review_summary(r) for r in reviews]


@router.get("/{document_id}/reviews/{review_id}", response_model=DocumentReviewResponse)
def get_review(
    document_id: uuid.UUID,
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific review with all comments."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    review = db.query(DocumentReview).filter(
        DocumentReview.id == review_id,
        DocumentReview.document_id == document_id,
    ).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    comments_response = []
    for c in review.comments:
        section_title = None
        if c.section:
            section_title = c.section.title
        comments_response.append({
            'id': c.id,
            'review_id': c.review_id,
            'document_section_id': c.document_section_id,
            'comment': c.comment,
            'is_resolved': c.is_resolved,
            'resolved_by': c.resolved_by,
            'resolved_at': c.resolved_at,
            'created_by': c.created_by,
            'created_at': c.created_at,
            'creator': _get_reviewer_info(c.creator) if c.creator else None,
            'section_title': section_title,
        })

    return {
        'id': review.id,
        'document_id': review.document_id,
        'reviewer_id': review.reviewer_id,
        'version_number': review.version_number,
        'status': review.status,
        'overall_comment': review.overall_comment,
        'reviewed_at': review.reviewed_at,
        'reviewer': _get_reviewer_info(review.reviewer),
        'comments': comments_response,
    }


@router.post("/{document_id}/reviews/{review_id}/comments/{comment_id}/resolve")
def resolve_comment(
    document_id: uuid.UUID,
    review_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve a review comment."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    comment = db.query(ReviewComment).join(DocumentReview).filter(
        ReviewComment.id == comment_id,
        DocumentReview.id == review_id,
        DocumentReview.document_id == document_id,
    ).first()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )

    comment.is_resolved = True
    comment.resolved_by = current_user.id
    comment.resolved_at = datetime.utcnow()

    db.commit()

    return {'message': 'Comment resolved'}
