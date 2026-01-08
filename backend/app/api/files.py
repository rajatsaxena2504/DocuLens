"""
Files API - File browsing and file-level documentation.
"""
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, User, Project, SDLCProject
from app.schemas.file_doc import (
    FileInfo,
    FileTreeNode,
    AnalyzeFileRequest,
    CreateFileDocumentRequest,
    FileAnalysisResponse,
    FileDocumentResponse,
    get_suggested_sections,
)
from app.services.file_analyzer import file_analyzer
from app.api.deps import get_current_user_optional

router = APIRouter()


# ============ Supported File Types ============

SUPPORTED_EXTENSIONS = {
    'py': 'python',
    'sql': 'sql',
    'ipynb': 'ipynb',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
}


def get_file_type(filename: str) -> Optional[str]:
    """Get file type from filename."""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    return SUPPORTED_EXTENSIONS.get(ext)


# ============ File Browsing ============

def _get_file_paths_for_project(db: Session, project_id: UUID) -> tuple[list[str], str]:
    """Get file paths from either Project (repository) or SDLCProject.
    Returns (file_paths, project_name).
    """
    # First try legacy Project (repository)
    project = db.query(Project).filter(Project.id == project_id).first()
    if project and project.analysis_data:
        analysis = project.analysis_data if isinstance(project.analysis_data, dict) else {}
        return analysis.get('file_tree', []), project.name or "Repository"

    # Try SDLCProject and aggregate from its repositories
    sdlc_project = db.query(SDLCProject).filter(SDLCProject.id == project_id).first()
    if sdlc_project:
        all_files = []
        for repo in sdlc_project.repositories:
            if repo.analysis_data:
                analysis = repo.analysis_data if isinstance(repo.analysis_data, dict) else {}
                repo_files = analysis.get('file_tree', [])
                # Prefix with repo name if multiple repos
                if len(sdlc_project.repositories) > 1:
                    all_files.extend([f"{repo.name}/{f}" for f in repo_files])
                else:
                    all_files.extend(repo_files)
        return all_files, sdlc_project.name

    return [], "Unknown"


@router.get("/projects/{project_id}/files", response_model=List[FileInfo])
def list_files(
    project_id: UUID,
    path: str = "",
    file_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List files in a project repository."""
    file_paths, _ = _get_file_paths_for_project(db, project_id)

    files = []
    for file_path in file_paths:
        if path and not file_path.startswith(path):
            continue

        ext = file_path.split('.')[-1] if '.' in file_path else ''
        detected_type = get_file_type(file_path)

        if file_type and detected_type != file_type:
            continue

        files.append(FileInfo(
            path=file_path,
            name=file_path.split('/')[-1],
            extension=ext,
            size=0,  # Size not available from analysis
            is_directory=False,
            file_type=detected_type,
        ))

    return files


@router.get("/projects/{project_id}/files/tree", response_model=FileTreeNode)
def get_file_tree(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get file tree structure for a project."""
    file_paths, project_name = _get_file_paths_for_project(db, project_id)

    # Build tree structure
    root = FileTreeNode(path="", name=project_name or "root", is_directory=True, children=[])

    for file_path in file_paths:
        parts = file_path.split('/')
        current = root

        for i, part in enumerate(parts):
            is_file = (i == len(parts) - 1)
            path_so_far = '/'.join(parts[:i + 1])

            # Find or create node
            existing = None
            if current.children:
                for child in current.children:
                    if child.name == part:
                        existing = child
                        break

            if existing:
                current = existing
            else:
                new_node = FileTreeNode(
                    path=path_so_far,
                    name=part,
                    is_directory=not is_file,
                    children=[] if not is_file else None,
                    file_type=get_file_type(part) if is_file else None,
                )
                if current.children is None:
                    current.children = []
                current.children.append(new_node)
                current = new_node

    return root


# ============ File Analysis ============

@router.post("/projects/{project_id}/files/analyze", response_model=FileAnalysisResponse)
def analyze_file(
    project_id: UUID,
    data: AnalyzeFileRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Analyze a specific file from a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_type = get_file_type(data.file_path)
    if not file_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Try to get file content
    # For now, return a mock analysis since we don't have the actual file content stored
    # In a real implementation, this would fetch from GitHub or stored archive
    mock_content = f"# Mock content for {data.file_path}"

    analysis = file_analyzer.analyze(mock_content, data.file_path)
    suggested_sections = get_suggested_sections(file_type)

    return FileAnalysisResponse(
        file_path=data.file_path,
        file_type=file_type,
        analysis=analysis,
        suggested_sections=suggested_sections,
    )


# ============ File-Level Documents ============

@router.post("/documents/file-level", response_model=FileDocumentResponse, status_code=status.HTTP_201_CREATED)
def create_file_document(
    data: CreateFileDocumentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a file-level document."""
    user_id = current_user.id if current_user else UUID("00000000-0000-0000-0000-000000000001")

    # Determine file type
    file_type = get_file_type(data.file_path)
    if not file_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Generate title if not provided
    title = data.title or f"Documentation: {data.file_path.split('/')[-1]}"

    # Create document
    document = Document(
        project_id=data.project_id,
        sdlc_project_id=data.sdlc_project_id,
        document_type_id=data.document_type_id,
        stage_id=data.stage_id,
        user_id=user_id,
        title=title,
        file_path=data.file_path,
        is_file_level=True,
        file_type=file_type,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return FileDocumentResponse(
        id=document.id,
        file_path=document.file_path,
        file_type=document.file_type,
        is_file_level=document.is_file_level,
        title=document.title,
        status=document.status,
        file_analysis=json.loads(document.file_analysis) if document.file_analysis else None,
        created_at=document.created_at,
    )


@router.get("/documents/{document_id}/file-info", response_model=FileDocumentResponse)
def get_file_document_info(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get file-level document information."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.is_file_level:
        raise HTTPException(status_code=400, detail="Document is not a file-level document")

    return FileDocumentResponse(
        id=document.id,
        file_path=document.file_path,
        file_type=document.file_type,
        is_file_level=document.is_file_level,
        title=document.title,
        status=document.status,
        file_analysis=json.loads(document.file_analysis) if document.file_analysis else None,
        created_at=document.created_at,
    )


@router.post("/documents/{document_id}/analyze-file", response_model=FileAnalysisResponse)
def analyze_document_file(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Analyze the file associated with a file-level document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.is_file_level or not document.file_path:
        raise HTTPException(status_code=400, detail="Document is not a file-level document")

    file_type = document.file_type or get_file_type(document.file_path)
    if not file_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Get file content from project if available
    # For now, use mock content
    mock_content = f"# Content for {document.file_path}"

    analysis = file_analyzer.analyze(mock_content, document.file_path)

    # Save analysis to document
    document.file_analysis = json.dumps(analysis)
    db.commit()

    suggested_sections = get_suggested_sections(file_type)

    return FileAnalysisResponse(
        file_path=document.file_path,
        file_type=file_type,
        analysis=analysis,
        suggested_sections=suggested_sections,
    )


# ============ List File-Level Documents ============

@router.get("/projects/{project_id}/file-documents", response_model=List[FileDocumentResponse])
def list_file_documents(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all file-level documents for a project."""
    documents = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_file_level == True,
    ).order_by(Document.created_at.desc()).all()

    return [
        FileDocumentResponse(
            id=doc.id,
            file_path=doc.file_path,
            file_type=doc.file_type,
            is_file_level=doc.is_file_level,
            title=doc.title,
            status=doc.status,
            file_analysis=json.loads(doc.file_analysis) if doc.file_analysis else None,
            created_at=doc.created_at,
        )
        for doc in documents
    ]
