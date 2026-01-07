from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models import SDLCProject, SDLCStage, Project, Document, User, OrganizationMember, ProjectMember
from app.schemas import (
    SDLCProjectCreate,
    SDLCProjectUpdate,
    SDLCProjectResponse,
    SDLCProjectDetail,
    SDLCStageResponse,
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectMemberResponse,
)
from app.api.deps import (
    get_current_user,
    check_org_membership,
    require_org_membership,
    require_org_editor,
)
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
    current_user: User = Depends(get_current_user),
):
    """Create a new SDLC project.

    If organization_id is provided, creates project under that org (requires editor role).
    Otherwise creates a personal project.
    """
    # If org specified, check editor permission
    if data.organization_id:
        require_org_editor(db, current_user.id, data.organization_id)
        project = SDLCProject(
            organization_id=data.organization_id,
            user_id=current_user.id,  # Creator
            name=data.name,
            description=data.description,
        )
    else:
        # Personal project (legacy mode)
        project = SDLCProject(
            user_id=current_user.id,
            name=data.name,
            description=data.description,
        )

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=List[SDLCProjectResponse])
def list_projects(
    organization_id: Optional[UUID] = Query(None, description="Filter by organization"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List SDLC projects accessible to the current user.

    - If organization_id is specified: returns projects in that org (requires membership)
    - Otherwise: returns all projects user has access to (personal + all org projects)
    """
    if organization_id:
        # Check org membership
        require_org_membership(db, current_user.id, organization_id)
        projects = (
            db.query(SDLCProject)
            .filter(SDLCProject.organization_id == organization_id)
            .order_by(SDLCProject.updated_at.desc())
            .all()
        )
    else:
        # Get user's org IDs
        user_org_ids = (
            db.query(OrganizationMember.organization_id)
            .filter(OrganizationMember.user_id == current_user.id)
            .subquery()
        )

        # Get personal projects + org projects
        projects = (
            db.query(SDLCProject)
            .filter(
                or_(
                    SDLCProject.user_id == current_user.id,  # Personal projects
                    SDLCProject.organization_id.in_(user_org_ids),  # Org projects
                )
            )
            .order_by(SDLCProject.updated_at.desc())
            .all()
        )

    return projects


def get_project_with_access(
    db: Session,
    project_id: UUID,
    user_id: UUID,
    require_edit: bool = False,
) -> SDLCProject:
    """Helper to get project and verify user has access.

    For org projects: checks org membership (and editor role if require_edit)
    For personal projects: checks user_id ownership
    """
    project = db.query(SDLCProject).filter(SDLCProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check access based on org or personal ownership
    if project.organization_id:
        membership = check_org_membership(db, user_id, project.organization_id)
        if not membership:
            raise HTTPException(status_code=404, detail="Project not found")
        if require_edit and membership.role not in ("admin", "editor"):
            raise HTTPException(status_code=403, detail="Editor access required")
    else:
        # Personal project - must be owner
        if project.user_id != user_id:
            raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.get("/{project_id}", response_model=SDLCProjectDetail)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific SDLC project with repositories and document counts"""
    project = get_project_with_access(db, project_id, current_user.id)

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
    current_user: User = Depends(get_current_user),
):
    """Update an SDLC project (requires editor access for org projects)"""
    project = get_project_with_access(db, project_id, current_user.id, require_edit=True)

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
    current_user: User = Depends(get_current_user),
):
    """Delete an SDLC project (requires editor access for org projects)"""
    project = get_project_with_access(db, project_id, current_user.id, require_edit=True)

    db.delete(project)
    db.commit()


# ============ Repositories (within SDLC Project) ============

@router.post("/{project_id}/repositories", response_model=RepositoryResponse)
def add_repository(
    project_id: UUID,
    data: RepositoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a GitHub repository to an SDLC project"""
    import os
    import shutil
    import uuid as uuid_module
    from app.services.code_analyzer import CodeAnalyzer

    # Verify project access (requires editor for org projects)
    sdlc_project = get_project_with_access(db, project_id, current_user.id, require_edit=True)

    # Generate repository ID and storage path
    repo_id = uuid_module.uuid4()
    storage_path = os.path.join("./uploads", str(current_user.id), str(repo_id))

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
        user_id=current_user.id,
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
    current_user: User = Depends(get_current_user),
):
    """List all repositories in an SDLC project"""
    # Verify project access
    sdlc_project = get_project_with_access(db, project_id, current_user.id)

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
    current_user: User = Depends(get_current_user),
):
    """Update a repository's metadata (requires editor access)"""
    # Verify project access with edit permission
    get_project_with_access(db, project_id, current_user.id, require_edit=True)

    repository = (
        db.query(Project)
        .filter(Project.id == repo_id, Project.sdlc_project_id == project_id)
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
    current_user: User = Depends(get_current_user),
):
    """Remove a repository from an SDLC project (requires editor access)"""
    # Verify project access with edit permission
    get_project_with_access(db, project_id, current_user.id, require_edit=True)

    repository = (
        db.query(Project)
        .filter(Project.id == repo_id, Project.sdlc_project_id == project_id)
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
    current_user: User = Depends(get_current_user),
):
    """Re-analyze a repository to refresh its analysis data (requires editor access)"""
    from app.services.code_analyzer import CodeAnalyzer

    # Verify project access with edit permission
    get_project_with_access(db, project_id, current_user.id, require_edit=True)

    repository = (
        db.query(Project)
        .filter(Project.id == repo_id, Project.sdlc_project_id == project_id)
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
    current_user: User = Depends(get_current_user),
):
    """Get all documents for a specific stage in an SDLC project"""
    # Verify project access
    sdlc_project = get_project_with_access(db, project_id, current_user.id)

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


# ============ Project Members ============

def get_project_membership(db: Session, project_id: UUID, user_id: UUID) -> Optional[ProjectMember]:
    """Get a user's membership in a project"""
    return (
        db.query(ProjectMember)
        .filter(
            ProjectMember.sdlc_project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )


def check_project_owner(db: Session, project_id: UUID, user_id: UUID) -> bool:
    """Check if user is an owner of the project"""
    membership = get_project_membership(db, project_id, user_id)
    return membership is not None and membership.role == "owner"


@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_project_members(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all members of a project"""
    # Verify project access
    get_project_with_access(db, project_id, current_user.id)

    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.sdlc_project_id == project_id)
        .order_by(ProjectMember.added_at)
        .all()
    )

    # Include user info in response
    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        result.append({
            "id": member.id,
            "sdlc_project_id": member.sdlc_project_id,
            "user_id": member.user_id,
            "role": member.role,
            "added_at": member.added_at,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
            } if user else None,
        })

    return result


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
def add_project_member(
    project_id: UUID,
    data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a member to a project by email (requires owner role)"""
    # Verify project access
    project = get_project_with_access(db, project_id, current_user.id)

    # Check if current user is owner
    if not check_project_owner(db, project_id, current_user.id):
        # If no members yet (new project), allow the creator to add members
        existing_members = db.query(ProjectMember).filter(
            ProjectMember.sdlc_project_id == project_id
        ).count()
        if existing_members > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owners can add members",
            )

    # Validate role
    if data.role not in ("owner", "editor", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'owner', 'editor', or 'viewer'",
        )

    # Find user by email
    user_to_add = db.query(User).filter(User.email == data.email).first()
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{data.email}' not found",
        )

    # Check if already a member
    existing_member = get_project_membership(db, project_id, user_to_add.id)
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project",
        )

    # If project belongs to an org, ensure user is a member of that org
    if project.organization_id:
        org_membership = check_org_membership(db, user_to_add.id, project.organization_id)
        if not org_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be a member of the organization to join project",
            )

    # Create membership
    member = ProjectMember(
        sdlc_project_id=project_id,
        user_id=user_to_add.id,
        role=data.role,
        added_by=current_user.id,
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return {
        "id": member.id,
        "sdlc_project_id": member.sdlc_project_id,
        "user_id": member.user_id,
        "role": member.role,
        "added_at": member.added_at,
        "user": {
            "id": str(user_to_add.id),
            "email": user_to_add.email,
            "name": user_to_add.name,
        },
    }


@router.patch("/{project_id}/members/{member_id}", response_model=ProjectMemberResponse)
def update_project_member(
    project_id: UUID,
    member_id: UUID,
    data: ProjectMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a member's role (requires owner role)"""
    # Verify project access
    get_project_with_access(db, project_id, current_user.id)

    # Check if current user is owner
    if not check_project_owner(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can change member roles",
        )

    # Validate role
    if data.role not in ("owner", "editor", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'owner', 'editor', or 'viewer'",
        )

    # Find the member
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.id == member_id,
            ProjectMember.sdlc_project_id == project_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Don't allow demoting the last owner
    if member.role == "owner" and data.role != "owner":
        owner_count = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.sdlc_project_id == project_id,
                ProjectMember.role == "owner",
            )
            .count()
        )
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last owner. Promote another member first.",
            )

    member.role = data.role
    db.commit()
    db.refresh(member)

    user = db.query(User).filter(User.id == member.user_id).first()

    return {
        "id": member.id,
        "sdlc_project_id": member.sdlc_project_id,
        "user_id": member.user_id,
        "role": member.role,
        "added_at": member.added_at,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
        } if user else None,
    }


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_member(
    project_id: UUID,
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from a project (requires owner role, or self-removal)"""
    # Verify project access
    get_project_with_access(db, project_id, current_user.id)

    # Find the member
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.id == member_id,
            ProjectMember.sdlc_project_id == project_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Check permissions: must be owner OR removing self
    is_owner = check_project_owner(db, project_id, current_user.id)
    is_self = member.user_id == current_user.id

    if not is_owner and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can remove members",
        )

    # Don't allow removing the last owner
    if member.role == "owner":
        owner_count = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.sdlc_project_id == project_id,
                ProjectMember.role == "owner",
            )
            .count()
        )
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last owner. Transfer ownership first.",
            )

    db.delete(member)
    db.commit()
