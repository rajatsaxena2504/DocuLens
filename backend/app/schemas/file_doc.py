"""File-level documentation schemas."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel


# ============ File Types ============

class FileType:
    PYTHON = "python"
    SQL = "sql"
    NOTEBOOK = "ipynb"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"


# ============ File Info Schemas ============

class FileInfo(BaseModel):
    """Information about a file in the repository."""
    path: str
    name: str
    extension: str
    size: int
    is_directory: bool = False
    file_type: Optional[str] = None  # python, sql, ipynb, js, ts


class FileTreeNode(BaseModel):
    """Node in a file tree structure."""
    path: str
    name: str
    is_directory: bool
    children: Optional[List["FileTreeNode"]] = None
    file_type: Optional[str] = None


# Self-referential model
FileTreeNode.model_rebuild()


# ============ Analysis Schemas ============

class FunctionAnalysis(BaseModel):
    """Analyzed function information."""
    name: str
    args: List[str]
    docstring: Optional[str] = None
    decorators: List[str] = []
    returns: Optional[str] = None
    line_number: int
    is_async: bool = False


class ClassAnalysis(BaseModel):
    """Analyzed class information."""
    name: str
    bases: List[str] = []
    docstring: Optional[str] = None
    methods: List[str] = []
    line_number: int


class PythonFileAnalysis(BaseModel):
    """Analysis result for Python files."""
    file_path: str
    file_type: str = "python"
    module_docstring: Optional[str] = None
    imports: List[str] = []
    from_imports: List[Dict[str, Any]] = []
    functions: List[FunctionAnalysis] = []
    classes: List[ClassAnalysis] = []
    global_variables: List[str] = []
    constants: List[str] = []
    entry_point: bool = False


class SQLFileAnalysis(BaseModel):
    """Analysis result for SQL files."""
    file_path: str
    file_type: str = "sql"
    tables_referenced: List[str] = []
    tables_created: List[str] = []
    tables_modified: List[str] = []
    ctes: List[str] = []
    joins: List[str] = []
    aggregations: List[str] = []
    subqueries: int = 0
    statement_types: List[str] = []
    comments: List[str] = []


class NotebookFileAnalysis(BaseModel):
    """Analysis result for Jupyter notebooks."""
    file_path: str
    file_type: str = "ipynb"
    title: Optional[str] = None
    total_cells: int = 0
    code_cells: int = 0
    markdown_cells: int = 0
    imports: List[str] = []
    functions: List[str] = []
    visualizations: List[str] = []
    data_sources: List[str] = []
    headings: List[str] = []


class JavaScriptFileAnalysis(BaseModel):
    """Analysis result for JavaScript/TypeScript files."""
    file_path: str
    file_type: str = "javascript"
    imports: List[str] = []
    exports: List[str] = []
    functions: List[FunctionAnalysis] = []
    classes: List[ClassAnalysis] = []
    constants: List[str] = []
    jsx_components: List[str] = []
    hooks_used: List[str] = []


# ============ Request Schemas ============

class AnalyzeFileRequest(BaseModel):
    """Request to analyze a specific file."""
    file_path: str


class CreateFileDocumentRequest(BaseModel):
    """Request to create file-level documentation."""
    project_id: Optional[UUID] = None  # Repository ID
    sdlc_project_id: Optional[UUID] = None
    stage_id: Optional[UUID] = None
    file_path: str
    title: Optional[str] = None
    document_type_id: Optional[UUID] = None


# ============ Response Schemas ============

class FileAnalysisResponse(BaseModel):
    """Response containing file analysis."""
    file_path: str
    file_type: str
    analysis: Dict[str, Any]
    suggested_sections: List[str] = []


class FileDocumentResponse(BaseModel):
    """Response for a file-level document."""
    id: UUID
    file_path: str
    file_type: Optional[str]
    is_file_level: bool
    title: str
    status: str
    file_analysis: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Section Suggestions by File Type ============

FILE_TYPE_SECTIONS = {
    "python": [
        "File Overview",
        "Module Dependencies",
        "Functions",
        "Classes",
        "Constants and Configuration",
        "Usage Examples",
        "Error Handling",
        "Testing Notes",
    ],
    "sql": [
        "Query Overview",
        "Tables Referenced",
        "Data Transformations",
        "CTEs and Subqueries",
        "Join Logic",
        "Aggregations",
        "Performance Considerations",
        "Business Logic",
    ],
    "ipynb": [
        "Notebook Overview",
        "Data Sources",
        "Data Processing Steps",
        "Visualizations",
        "Key Findings",
        "Dependencies",
        "Reproducibility Notes",
    ],
    "javascript": [
        "Module Overview",
        "Dependencies",
        "Components",
        "Functions and Utilities",
        "State Management",
        "API Integration",
        "Testing Notes",
    ],
}


def get_suggested_sections(file_type: str) -> List[str]:
    """Get suggested sections for a file type."""
    return FILE_TYPE_SECTIONS.get(file_type, ["File Overview", "Content", "Notes"])
