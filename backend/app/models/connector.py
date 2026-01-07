import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class Connector(Base):
    """Model for external service connectors (Jira, Confluence, Miro, SharePoint)."""
    __tablename__ = "connectors"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(30), nullable=False)  # jira, confluence, miro, sharepoint
    name = Column(String(100), nullable=False)
    config = Column(Text, nullable=False)  # JSON - encrypted credentials
    is_active = Column(Boolean, default=True)
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="connectors")
    creator = relationship("User", foreign_keys=[created_by])
    imports = relationship("ConnectorImport", back_populates="connector", cascade="all, delete-orphan")

    def get_config(self) -> dict:
        """Get parsed config dict."""
        return json.loads(self.config) if self.config else {}

    def set_config(self, config: dict):
        """Set config from dict."""
        self.config = json.dumps(config)


class ConnectorImport(Base):
    """Model for tracking content imported from connectors."""
    __tablename__ = "connector_imports"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    connector_id = Column(GUID(), ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(GUID(), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(50), nullable=True)  # jira_issue, confluence_page, etc.
    source_id = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    imported_content = Column(Text, nullable=True)
    imported_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    connector = relationship("Connector", back_populates="imports")
    document = relationship("Document", back_populates="imports")
