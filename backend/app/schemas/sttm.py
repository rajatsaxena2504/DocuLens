"""STTM (Source to Target Mapping) schemas."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel


# ============ Transformation Types ============

class TransformationType:
    DIRECT = "direct"
    DERIVED = "derived"
    CONSTANT = "constant"
    LOOKUP = "lookup"
    AGGREGATE = "aggregate"
    CONDITIONAL = "conditional"


# ============ Request Schemas ============

class STTMMappingCreate(BaseModel):
    # Source
    source_system: Optional[str] = None
    source_table: Optional[str] = None
    source_column: Optional[str] = None
    source_datatype: Optional[str] = None

    # Target
    target_system: Optional[str] = None
    target_table: Optional[str] = None
    target_column: Optional[str] = None
    target_datatype: Optional[str] = None

    # Transformation
    transformation_logic: Optional[str] = None
    transformation_type: Optional[str] = None

    # Metadata
    business_rule: Optional[str] = None
    is_key: bool = False
    is_nullable: bool = True
    default_value: Optional[str] = None
    notes: Optional[str] = None

    display_order: int = 0


class STTMMappingUpdate(BaseModel):
    source_system: Optional[str] = None
    source_table: Optional[str] = None
    source_column: Optional[str] = None
    source_datatype: Optional[str] = None

    target_system: Optional[str] = None
    target_table: Optional[str] = None
    target_column: Optional[str] = None
    target_datatype: Optional[str] = None

    transformation_logic: Optional[str] = None
    transformation_type: Optional[str] = None

    business_rule: Optional[str] = None
    is_key: Optional[bool] = None
    is_nullable: Optional[bool] = None
    default_value: Optional[str] = None
    notes: Optional[str] = None

    display_order: Optional[int] = None


class STTMBulkCreate(BaseModel):
    """Bulk create mappings."""
    mappings: List[STTMMappingCreate]


class STTMReorderRequest(BaseModel):
    """Reorder mappings by ID."""
    mapping_orders: List[Dict[str, Any]]  # [{id: UUID, display_order: int}]


# ============ Response Schemas ============

class STTMMappingResponse(BaseModel):
    id: UUID
    document_id: UUID

    source_system: Optional[str] = None
    source_table: Optional[str] = None
    source_column: Optional[str] = None
    source_datatype: Optional[str] = None

    target_system: Optional[str] = None
    target_table: Optional[str] = None
    target_column: Optional[str] = None
    target_datatype: Optional[str] = None

    transformation_logic: Optional[str] = None
    transformation_type: Optional[str] = None

    business_rule: Optional[str] = None
    is_key: bool
    is_nullable: bool
    default_value: Optional[str] = None
    notes: Optional[str] = None

    display_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class STTMSummary(BaseModel):
    """Summary statistics for STTM mappings."""
    total_mappings: int
    source_systems: List[str]
    target_systems: List[str]
    transformation_types: Dict[str, int]
    key_columns: int
    nullable_columns: int


class STTMExportRow(BaseModel):
    """Row format for CSV/Excel export."""
    source_system: str
    source_table: str
    source_column: str
    source_datatype: str
    target_system: str
    target_table: str
    target_column: str
    target_datatype: str
    transformation_type: str
    transformation_logic: str
    business_rule: str
    is_key: str
    is_nullable: str
    default_value: str
    notes: str


class STTMImportRequest(BaseModel):
    """Import mappings from CSV data."""
    data: List[Dict[str, str]]
    column_mapping: Optional[Dict[str, str]] = None  # Maps CSV columns to STTM fields


class STTMGenerateDocRequest(BaseModel):
    """Generate documentation narrative from mappings."""
    include_sections: Optional[List[str]] = None  # e.g., ["overview", "transformations", "rules"]
    format: str = "markdown"  # markdown, html


class STTMGenerateDocResponse(BaseModel):
    """Generated documentation content."""
    content: str
    sections: Dict[str, str]
