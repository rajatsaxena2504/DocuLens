"""STTM (Source to Target Mapping) model for ETL/data pipeline documentation."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class STTMMapping(Base):
    """Model for source-to-target data mappings."""
    __tablename__ = "sttm_mappings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID(), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)

    # Source fields
    source_system = Column(String(100), nullable=True)
    source_table = Column(String(255), nullable=True)
    source_column = Column(String(255), nullable=True)
    source_datatype = Column(String(100), nullable=True)

    # Target fields
    target_system = Column(String(100), nullable=True)
    target_table = Column(String(255), nullable=True)
    target_column = Column(String(255), nullable=True)
    target_datatype = Column(String(100), nullable=True)

    # Transformation
    transformation_logic = Column(Text, nullable=True)
    transformation_type = Column(String(50), nullable=True)  # direct, derived, constant, lookup

    # Metadata
    business_rule = Column(Text, nullable=True)
    is_key = Column(Boolean, default=False)
    is_nullable = Column(Boolean, default=True)
    default_value = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="sttm_mappings")


# Transformation type constants
class TransformationType:
    DIRECT = "direct"          # 1:1 mapping, no transformation
    DERIVED = "derived"        # Calculated from source columns
    CONSTANT = "constant"      # Static value
    LOOKUP = "lookup"          # Lookup from reference table
    AGGREGATE = "aggregate"    # Aggregation (SUM, COUNT, etc.)
    CONDITIONAL = "conditional"  # CASE/IF logic
