"""
STTM API - Source to Target Mapping for ETL/data pipeline documentation.
"""
from collections import Counter
from typing import List, Optional
from uuid import UUID
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import STTMMapping, Document, User
from app.schemas.sttm import (
    STTMMappingCreate,
    STTMMappingUpdate,
    STTMMappingResponse,
    STTMBulkCreate,
    STTMReorderRequest,
    STTMSummary,
    STTMImportRequest,
    STTMGenerateDocRequest,
    STTMGenerateDocResponse,
)
from app.api.deps import get_current_user_optional

router = APIRouter()


# ============ Helper Functions ============

def get_document_or_404(db: Session, document_id: UUID) -> Document:
    """Get document or raise 404."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def get_next_order(db: Session, document_id: UUID) -> int:
    """Get the next display order for a mapping."""
    max_order = db.query(STTMMapping.display_order).filter(
        STTMMapping.document_id == document_id
    ).order_by(STTMMapping.display_order.desc()).first()
    return (max_order[0] + 1) if max_order else 0


# ============ STTM CRUD ============

@router.get("/documents/{document_id}/sttm", response_model=List[STTMMappingResponse])
def list_mappings(
    document_id: UUID,
    source_system: Optional[str] = None,
    target_system: Optional[str] = None,
    transformation_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """List all STTM mappings for a document."""
    get_document_or_404(db, document_id)

    query = db.query(STTMMapping).filter(STTMMapping.document_id == document_id)

    if source_system:
        query = query.filter(STTMMapping.source_system == source_system)
    if target_system:
        query = query.filter(STTMMapping.target_system == target_system)
    if transformation_type:
        query = query.filter(STTMMapping.transformation_type == transformation_type)

    mappings = query.order_by(STTMMapping.display_order).all()
    return mappings


@router.post("/documents/{document_id}/sttm", response_model=STTMMappingResponse, status_code=status.HTTP_201_CREATED)
def create_mapping(
    document_id: UUID,
    data: STTMMappingCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Create a new STTM mapping."""
    get_document_or_404(db, document_id)

    # Auto-assign display order if not provided
    if data.display_order == 0:
        data.display_order = get_next_order(db, document_id)

    mapping = STTMMapping(
        document_id=document_id,
        **data.model_dump()
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("/documents/{document_id}/sttm/{mapping_id}", response_model=STTMMappingResponse)
def get_mapping(
    document_id: UUID,
    mapping_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get a specific STTM mapping."""
    mapping = db.query(STTMMapping).filter(
        STTMMapping.id == mapping_id,
        STTMMapping.document_id == document_id
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return mapping


@router.put("/documents/{document_id}/sttm/{mapping_id}", response_model=STTMMappingResponse)
def update_mapping(
    document_id: UUID,
    mapping_id: UUID,
    data: STTMMappingUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Update an STTM mapping."""
    mapping = db.query(STTMMapping).filter(
        STTMMapping.id == mapping_id,
        STTMMapping.document_id == document_id
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mapping, field, value)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/documents/{document_id}/sttm/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mapping(
    document_id: UUID,
    mapping_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Delete an STTM mapping."""
    mapping = db.query(STTMMapping).filter(
        STTMMapping.id == mapping_id,
        STTMMapping.document_id == document_id
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    db.delete(mapping)
    db.commit()


# ============ Bulk Operations ============

@router.post("/documents/{document_id}/sttm/bulk", response_model=List[STTMMappingResponse])
def bulk_create_mappings(
    document_id: UUID,
    data: STTMBulkCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Bulk create STTM mappings."""
    get_document_or_404(db, document_id)

    start_order = get_next_order(db, document_id)
    created_mappings = []

    for i, mapping_data in enumerate(data.mappings):
        mapping = STTMMapping(
            document_id=document_id,
            display_order=start_order + i,
            **mapping_data.model_dump(exclude={'display_order'})
        )
        db.add(mapping)
        created_mappings.append(mapping)

    db.commit()
    for m in created_mappings:
        db.refresh(m)

    return created_mappings


@router.patch("/documents/{document_id}/sttm/reorder", response_model=List[STTMMappingResponse])
def reorder_mappings(
    document_id: UUID,
    data: STTMReorderRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Reorder STTM mappings."""
    get_document_or_404(db, document_id)

    for order_item in data.mapping_orders:
        mapping_id = order_item.get("id")
        new_order = order_item.get("display_order")
        if mapping_id and new_order is not None:
            db.query(STTMMapping).filter(
                STTMMapping.id == mapping_id,
                STTMMapping.document_id == document_id
            ).update({"display_order": new_order})

    db.commit()

    return db.query(STTMMapping).filter(
        STTMMapping.document_id == document_id
    ).order_by(STTMMapping.display_order).all()


@router.delete("/documents/{document_id}/sttm", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_mappings(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Delete all STTM mappings for a document."""
    get_document_or_404(db, document_id)
    db.query(STTMMapping).filter(STTMMapping.document_id == document_id).delete()
    db.commit()


# ============ Import/Export ============

@router.post("/documents/{document_id}/sttm/import", response_model=List[STTMMappingResponse])
def import_mappings(
    document_id: UUID,
    data: STTMImportRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Import STTM mappings from CSV data."""
    get_document_or_404(db, document_id)

    # Default column mapping
    default_mapping = {
        "source_system": "source_system",
        "source_table": "source_table",
        "source_column": "source_column",
        "source_datatype": "source_datatype",
        "target_system": "target_system",
        "target_table": "target_table",
        "target_column": "target_column",
        "target_datatype": "target_datatype",
        "transformation_type": "transformation_type",
        "transformation_logic": "transformation_logic",
        "business_rule": "business_rule",
        "is_key": "is_key",
        "is_nullable": "is_nullable",
        "default_value": "default_value",
        "notes": "notes",
    }

    column_mapping = data.column_mapping or default_mapping
    start_order = get_next_order(db, document_id)
    created_mappings = []

    for i, row in enumerate(data.data):
        mapping_data = {}
        for field, csv_col in column_mapping.items():
            value = row.get(csv_col, "")
            if field in ("is_key", "is_nullable"):
                mapping_data[field] = value.lower() in ("true", "yes", "1", "y")
            else:
                mapping_data[field] = value if value else None

        mapping = STTMMapping(
            document_id=document_id,
            display_order=start_order + i,
            **mapping_data
        )
        db.add(mapping)
        created_mappings.append(mapping)

    db.commit()
    for m in created_mappings:
        db.refresh(m)

    return created_mappings


@router.get("/documents/{document_id}/sttm/export")
def export_mappings(
    document_id: UUID,
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Export STTM mappings to CSV."""
    get_document_or_404(db, document_id)

    mappings = db.query(STTMMapping).filter(
        STTMMapping.document_id == document_id
    ).order_by(STTMMapping.display_order).all()

    # Create CSV
    output = io.StringIO()
    fieldnames = [
        "source_system", "source_table", "source_column", "source_datatype",
        "target_system", "target_table", "target_column", "target_datatype",
        "transformation_type", "transformation_logic",
        "business_rule", "is_key", "is_nullable", "default_value", "notes"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for m in mappings:
        writer.writerow({
            "source_system": m.source_system or "",
            "source_table": m.source_table or "",
            "source_column": m.source_column or "",
            "source_datatype": m.source_datatype or "",
            "target_system": m.target_system or "",
            "target_table": m.target_table or "",
            "target_column": m.target_column or "",
            "target_datatype": m.target_datatype or "",
            "transformation_type": m.transformation_type or "",
            "transformation_logic": m.transformation_logic or "",
            "business_rule": m.business_rule or "",
            "is_key": "Yes" if m.is_key else "No",
            "is_nullable": "Yes" if m.is_nullable else "No",
            "default_value": m.default_value or "",
            "notes": m.notes or "",
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sttm_mappings_{document_id}.csv"}
    )


# ============ Summary & Statistics ============

@router.get("/documents/{document_id}/sttm/summary", response_model=STTMSummary)
def get_sttm_summary(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get summary statistics for STTM mappings."""
    get_document_or_404(db, document_id)

    mappings = db.query(STTMMapping).filter(
        STTMMapping.document_id == document_id
    ).all()

    source_systems = set()
    target_systems = set()
    transformation_types = Counter()
    key_count = 0
    nullable_count = 0

    for m in mappings:
        if m.source_system:
            source_systems.add(m.source_system)
        if m.target_system:
            target_systems.add(m.target_system)
        if m.transformation_type:
            transformation_types[m.transformation_type] += 1
        if m.is_key:
            key_count += 1
        if m.is_nullable:
            nullable_count += 1

    return STTMSummary(
        total_mappings=len(mappings),
        source_systems=sorted(source_systems),
        target_systems=sorted(target_systems),
        transformation_types=dict(transformation_types),
        key_columns=key_count,
        nullable_columns=nullable_count,
    )


# ============ Generate Documentation ============

@router.post("/documents/{document_id}/sttm/generate-doc", response_model=STTMGenerateDocResponse)
def generate_documentation(
    document_id: UUID,
    data: STTMGenerateDocRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Generate narrative documentation from STTM mappings."""
    document = get_document_or_404(db, document_id)

    mappings = db.query(STTMMapping).filter(
        STTMMapping.document_id == document_id
    ).order_by(STTMMapping.display_order).all()

    if not mappings:
        return STTMGenerateDocResponse(
            content="No mappings defined for this document.",
            sections={}
        )

    # Build sections
    sections = {}

    # Overview section
    source_systems = set(m.source_system for m in mappings if m.source_system)
    target_systems = set(m.target_system for m in mappings if m.target_system)

    overview = f"""## Overview

This document describes the data mapping from source to target systems.

**Source Systems:** {', '.join(sorted(source_systems)) or 'Not specified'}
**Target Systems:** {', '.join(sorted(target_systems)) or 'Not specified'}
**Total Mappings:** {len(mappings)}
"""
    sections["overview"] = overview

    # Mapping table section
    mapping_table = "## Mapping Table\n\n"
    mapping_table += "| Source Table.Column | Target Table.Column | Type | Transformation |\n"
    mapping_table += "|---------------------|---------------------|------|----------------|\n"

    for m in mappings:
        source = f"{m.source_table or ''}.{m.source_column or ''}"
        target = f"{m.target_table or ''}.{m.target_column or ''}"
        mapping_table += f"| {source} | {target} | {m.transformation_type or 'direct'} | {m.transformation_logic or '-'} |\n"

    sections["mapping_table"] = mapping_table

    # Transformation rules section
    derived_mappings = [m for m in mappings if m.transformation_type in ('derived', 'conditional', 'aggregate')]
    if derived_mappings:
        transformations = "## Transformation Rules\n\n"
        for m in derived_mappings:
            transformations += f"### {m.target_table}.{m.target_column}\n\n"
            transformations += f"**Type:** {m.transformation_type}\n\n"
            if m.transformation_logic:
                transformations += f"```\n{m.transformation_logic}\n```\n\n"
            if m.business_rule:
                transformations += f"**Business Rule:** {m.business_rule}\n\n"
        sections["transformations"] = transformations

    # Business rules section
    rules_mappings = [m for m in mappings if m.business_rule]
    if rules_mappings:
        rules = "## Business Rules\n\n"
        for m in rules_mappings:
            rules += f"- **{m.target_table}.{m.target_column}:** {m.business_rule}\n"
        sections["business_rules"] = rules

    # Combine all sections
    content = "\n".join(sections.values())

    return STTMGenerateDocResponse(content=content, sections=sections)
