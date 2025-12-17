from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import SDLCProject, SDLCStage, Project, Document, User
from app.schemas import (
    SDLCProjectCreate,
    SDLCProjectUpdate,
    SDLCProjectResponse,
    SDLCProjectWithRepositories,
    SDLCProjectDetail,
    SDLCStageResponse,
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
    StageWithDocuments,
)
from app.api.deps import get_current_user_optional
from app.services.github_service import GitHubService

router = APIRouter()


# ============ SDLC Stages ============

@router.get("/stages", response_model=List[SDLCStageResponse])
def list_stages(db: Session = Depends(get_db)):
    """List all SDLC stages"""
    stages = db.query(SDLCStage).order_by(SDLCStage.display_order).all()
    return stages


@router.get("/stages/{stage_id}", response_model=SDLCStageResponse)
def get_stage(stage_id: UUID, db: Session = Depends(get_db)):
    """Get a specific SDLC stage"""
    stage = db.query(SDLCStage).filter(SDLCStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return stage


# ============ SDLC Projects ============

@router.post("", response_model=SDLCProjectResponse)
def create_project(
    data: SDLCProjectCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a new SDLC project"""
    # Use mock user ID if auth is disabled
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    project = SDLCProject(
        user_id=user_id,
        name=data.name,
        description=data.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=List[SDLCProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all SDLC projects for the current user"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    projects = (
        db.query(SDLCProject)
        .filter(SDLCProject.user_id == user_id)
        .order_by(SDLCProject.updated_at.desc())
        .all()
    )
    return projects


@router.get("/{project_id}", response_model=SDLCProjectDetail)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get a specific SDLC project with repositories and document counts"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    project = (
        db.query(SDLCProject)
        .filter(SDLCProject.id == project_id, SDLCProject.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get document counts per stage
    stage_counts = (
        db.query(SDLCStage.id, func.count(Document.id))
        .outerjoin(Document, Document.stage_id == SDLCStage.id)
        .join(Project, Document.project_id == Project.id, isouter=True)
        .filter(Project.sdlc_project_id == project_id)
        .group_by(SDLCStage.id)
        .all()
    )

    stage_document_counts = {str(stage_id): count for stage_id, count in stage_counts}

    return SDLCProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        repositories=[RepositoryResponse.model_validate(r) for r in project.repositories],
        stage_document_counts=stage_document_counts,
    )


@router.put("/{project_id}", response_model=SDLCProjectResponse)
def update_project(
    project_id: UUID,
    data: SDLCProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update an SDLC project"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    project = (
        db.query(SDLCProject)
        .filter(SDLCProject.id == project_id, SDLCProject.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Delete an SDLC project"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    project = (
        db.query(SDLCProject)
        .filter(SDLCProject.id == project_id, SDLCProject.user_id == user_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()


# ============ Repositories (within SDLC Project) ============

@router.post("/{project_id}/repositories", response_model=RepositoryResponse)
def add_repository(
    project_id: UUID,
    data: RepositoryCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Add a GitHub repository to an SDLC project"""
    import os
    import shutil
    import uuid as uuid_module
    from app.services.code_analyzer import CodeAnalyzer

    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Verify project exists and belongs to user
    sdlc_project = (
        db.query(SDLCProject)
        .filter(SDLCProject.id == project_id, SDLCProject.user_id == user_id)
        .first()
    )
    if not sdlc_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate repository ID and storage path
    repo_id = uuid_module.uuid4()
    storage_path = os.path.join("./uploads", str(user_id), str(repo_id))

    # Clone the repository
    github_service = GitHubService()
    try:
        repo_info = github_service.clone_repository(str(data.github_url), storage_path)
    except Exception as e:
        if os.path.exists(storage_path):
            shutil.rmtree(storage_path)
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {str(e)}")

    # Extract repo name from URL if not provided
    name = data.name or repo_info.get("name", "Unnamed Repository")

    # Analyze the code
    code_analyzer = CodeAnalyzer()
    try:
        analysis_data = code_analyzer.analyze_repository(storage_path)
    except Exception as e:
        analysis_data = {"error": str(e)}

    # Create the repository (using existing Project model)
    repository = Project(
        id=repo_id,
        user_id=user_id,
        sdlc_project_id=project_id,
        name=name,
        description=data.description,
        source_type="github",
        repo_type=data.repo_type,
        github_url=str(data.github_url),
        storage_path=storage_path,
        analysis_data=analysis_data,
    )

    db.add(repository)
    db.commit()
    db.refresh(repository)
    return repository


@router.get("/{project_id}/repositories", response_model=List[RepositoryResponse])
def list_repositories(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all repositories in an SDLC project"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Verify project exists and belongs to user
    sdlc_project = (
        db.query(SDLCProject)
        .filter(SDLCProject.id == project_id, SDLCProject.user_id == user_id)
        .first()
    )
    if not sdlc_project:
        raise HTTPException(status_code=404, detail="Project not found")

    repositories = (
        db.query(Project)
        .filter(Project.sdlc_project_id == project_id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return repositories


@router.put("/{project_id}/repositories/{repo_id}", response_model=RepositoryResponse)
def update_repository(
    project_id: UUID,
    repo_id: UUID,
    data: RepositoryUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update a repository's metadata"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    repository = (
        db.query(Project)
        .filter(
            Project.id == repo_id,
            Project.sdlc_project_id == project_id,
            Project.user_id == user_id,
        )
        .first()
    )
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repository, field, value)

    db.commit()
    db.refresh(repository)
    return repository


@router.delete("/{project_id}/repositories/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_repository(
    project_id: UUID,
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Remove a repository from an SDLC project"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    repository = (
        db.query(Project)
        .filter(
            Project.id == repo_id,
            Project.sdlc_project_id == project_id,
            Project.user_id == user_id,
        )
        .first()
    )
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")

    db.delete(repository)
    db.commit()


@router.post("/{project_id}/repositories/{repo_id}/analyze", response_model=RepositoryResponse)
def refresh_repository_analysis(
    project_id: UUID,
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Re-analyze a repository to refresh its analysis data"""
    from app.services.code_analyzer import CodeAnalyzer

    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    repository = (
        db.query(Project)
        .filter(
            Project.id == repo_id,
            Project.sdlc_project_id == project_id,
            Project.user_id == user_id,
        )
        .first()
    )
    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Re-analyze the code
    code_analyzer = CodeAnalyzer()
    try:
        analysis_data = code_analyzer.analyze_repository(repository.storage_path)
        repository.analysis_data = analysis_data
        db.commit()
        db.refresh(repository)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return repository


# ============ Stage Documents ============

@router.get("/{project_id}/stages/{stage_id}/documents")
def get_stage_documents(
    project_id: UUID,
    stage_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get all documents for a specific stage in an SDLC project"""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Verify project exists and belongs to user
    sdlc_project = (
        db.query(SDLCProject)
        .filter(SDLCProject.id == project_id, SDLCProject.user_id == user_id)
        .first()
    )
    if not sdlc_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all repositories in this project
    repo_ids = [r.id for r in sdlc_project.repositories]

    # Get documents for this stage from any of the project's repositories
    documents = (
        db.query(Document)
        .filter(
            Document.project_id.in_(repo_ids),
            Document.stage_id == stage_id,
        )
        .order_by(Document.updated_at.desc())
        .all()
    )

    return documents
