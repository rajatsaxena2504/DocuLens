# DocuLens Feature Implementation Plan

## Overview

This plan covers 8 major features to transform DocuLens into a multi-tenant, collaborative documentation platform.

**Baseline Tag**: `v0.2.0-baseline`

---

## Implementation Phases

```
Phase 1: Multi-tenant Foundation ────────────────────────────────┐
         (User Auth, Organizations, Roles)                       │
                          │                                      │
         ┌────────────────┼────────────────┐                     │
         ▼                ▼                ▼                     │
Phase 2a: Version    Phase 2b: File    Phase 2c: STTM            │
Management           Level Docs        (can start early)         │
         │                │                │                     │
         └────────────────┴────────────────┘                     │
                          │                                      │
Phase 3: Multi-user Projects ◄───────────────────────────────────┘
         (Project Members, Permissions)
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
Phase 4: Review Workflow          Phase 5: Admin Template Library
         │                                 │
         └────────────────┬────────────────┘
                          ▼
Phase 6: Connectors (Jira, Confluence, Miro, SharePoint)
```

---

## Phase 1: Multi-tenant Foundation

**Goal**: Enable authentication and organization-based access control.

### Database Changes

```sql
-- New: Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSON,  -- org-level settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- New: Organization members
CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'admin', 'editor', 'viewer'
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Modify: Users table
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- Modify: SDLC Projects - add org ownership
ALTER TABLE sdlc_projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE sdlc_projects DROP COLUMN user_id;  -- access via org membership

-- Modify: Document types & sections - org-level templates
ALTER TABLE document_types ADD COLUMN organization_id UUID REFERENCES organizations(id);
-- is_system=true, org_id=null -> system template
-- is_system=false, org_id=X -> org template

ALTER TABLE sections ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

### New Models

```python
# backend/app/models/organization.py
class Organization(Base):
    __tablename__ = "organizations"
    id: GUID
    name: str
    slug: str (unique)
    settings: JSON
    created_at, updated_at

    # Relationships
    members: List[OrganizationMember]
    projects: List[SDLCProject]
    templates: List[DocumentType]
    sections: List[Section]

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    id: GUID
    organization_id: GUID (FK)
    user_id: GUID (FK)
    role: Enum['admin', 'editor', 'viewer']
    invited_by: GUID (FK)
    joined_at: datetime
```

### API Changes

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/auth/register` | POST | Register new user | Public |
| `/api/auth/login` | POST | Login, get JWT | Public |
| `/api/auth/me` | GET | Current user info | User |
| `/api/auth/refresh` | POST | Refresh token | User |
| `/api/organizations` | POST | Create organization | User |
| `/api/organizations` | GET | List user's organizations | User |
| `/api/organizations/{id}` | GET | Get organization details | Member |
| `/api/organizations/{id}` | PUT | Update organization | Admin |
| `/api/organizations/{id}/members` | GET | List members | Member |
| `/api/organizations/{id}/members` | POST | Invite member | Admin |
| `/api/organizations/{id}/members/{uid}` | DELETE | Remove member | Admin |
| `/api/organizations/{id}/members/{uid}` | PATCH | Change role | Admin |

### Frontend Changes

1. **Enable Auth Pages**
   - `/login` - Login form
   - `/register` - Registration form
   - `/forgot-password` - Password reset

2. **Organization Pages**
   - `/organizations` - List/select organization
   - `/organizations/new` - Create organization
   - `/organizations/{id}/settings` - Org settings (admin)
   - `/organizations/{id}/members` - Member management (admin)

3. **UI Updates**
   - Org switcher in header
   - Role-based button visibility
   - Protected routes with auth check

### Permission Matrix

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| View projects | ✓ | ✓ | ✓ |
| Create projects | ✓ | ✓ | ✗ |
| Delete projects | ✓ | ✗ | ✗ |
| Create documents | ✓ | ✓ | ✗ |
| Edit documents | ✓ | ✓ | ✗ |
| Delete documents | ✓ | ✗ | ✗ |
| Manage templates | ✓ | ✗ | ✗ |
| Manage members | ✓ | ✗ | ✗ |
| Org settings | ✓ | ✗ | ✗ |

---

## Phase 2a: Version Management

**Goal**: Track document versions with history, comparison, and rollback.

### Database Changes

```sql
-- New: Document versions (snapshots)
CREATE TABLE document_versions (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSON NOT NULL,  -- full content snapshot
    change_summary VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- Modify: Documents
ALTER TABLE documents ADD COLUMN current_version INTEGER DEFAULT 1;

-- Modify: Generated content - track who changed
ALTER TABLE generated_content ADD COLUMN modified_by UUID REFERENCES users(id);
ALTER TABLE generated_content ADD COLUMN modified_at TIMESTAMP;
```

### API Changes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/{id}/versions` | GET | List all versions |
| `/api/documents/{id}/versions` | POST | Create new version (snapshot) |
| `/api/documents/{id}/versions/{vid}` | GET | Get specific version |
| `/api/documents/{id}/versions/{vid}/restore` | POST | Restore to version |
| `/api/documents/{id}/versions/compare` | GET | Compare two versions (?v1=X&v2=Y) |

### Frontend Changes

1. **Version Panel** (sidebar in editor)
   - Version list with timestamps
   - "Save Version" button
   - Auto-save indicator

2. **Version Comparison View**
   - Side-by-side diff
   - Inline diff toggle
   - Section-by-section changes

3. **Restore Flow**
   - Preview before restore
   - Confirmation dialog
   - Creates new version on restore

---

## Phase 2b: File-level Documentation

**Goal**: Generate documentation for individual files (Python, SQL, notebooks, JS).

### Database Changes

```sql
-- Modify: Documents - add file-level support
ALTER TABLE documents ADD COLUMN file_path VARCHAR(500);
ALTER TABLE documents ADD COLUMN is_file_level BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN file_type VARCHAR(20);  -- python, sql, ipynb, js, ts

-- New document types for files (seeded)
-- "Python Module Documentation"
-- "SQL Script Documentation"
-- "Jupyter Notebook Documentation"
-- "JavaScript Module Documentation"

-- New sections for files (seeded)
-- "File Overview", "Imports/Dependencies", "Functions", "Classes"
-- "Main Logic", "Usage Examples", "Parameters", "Return Values"
-- For SQL: "Tables Referenced", "CTEs", "Query Logic", "Performance Notes"
-- For Notebooks: "Cell Summary", "Visualizations", "Data Flow"
```

### Code Analysis Enhancements

```python
# backend/app/services/file_analyzer.py
class FileAnalyzer:
    def analyze_python(self, content: str) -> dict:
        # Parse AST
        # Extract: imports, functions, classes, docstrings
        # Return structured analysis

    def analyze_sql(self, content: str) -> dict:
        # Parse SQL
        # Extract: tables, CTEs, joins, aggregations
        # Return structured analysis

    def analyze_notebook(self, content: dict) -> dict:
        # Parse notebook JSON
        # Extract: code cells, markdown, outputs
        # Return structured analysis

    def analyze_javascript(self, content: str) -> dict:
        # Parse JS/TS
        # Extract: imports, exports, functions, classes
        # Return structured analysis
```

### API Changes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/{id}/files` | GET | List files in repo (filterable) |
| `/api/projects/{id}/files/tree` | GET | File tree structure |
| `/api/projects/{id}/files/analyze` | POST | Analyze specific file |
| `/api/documents/file-level` | POST | Create file-level document |

### Frontend Changes

1. **File Browser** (in project view)
   - Tree view of repo files
   - Filter by file type
   - Select files for documentation

2. **File Document Creation**
   - Select file → choose template
   - Preview file content
   - Auto-suggested sections based on file type

3. **File Document Editor**
   - File content panel (read-only)
   - Generated sections panel
   - Syntax highlighting

---

## Phase 2c: STTM (Source to Target Mapping)

**Goal**: Specialized document type for ETL/data pipeline documentation.

### Database Changes

```sql
-- New: STTM mappings table
CREATE TABLE sttm_mappings (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- Source
    source_system VARCHAR(100),
    source_table VARCHAR(255),
    source_column VARCHAR(255),
    source_datatype VARCHAR(100),

    -- Target
    target_system VARCHAR(100),
    target_table VARCHAR(255),
    target_column VARCHAR(255),
    target_datatype VARCHAR(100),

    -- Transformation
    transformation_logic TEXT,
    transformation_type VARCHAR(50),  -- direct, derived, constant, lookup

    -- Metadata
    business_rule TEXT,
    is_key BOOLEAN DEFAULT FALSE,
    is_nullable BOOLEAN DEFAULT TRUE,
    default_value VARCHAR(255),
    notes TEXT,

    display_order INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Seed: STTM document type
-- Stage: Design
-- Sections: Overview, Source Systems, Target Systems, Mapping Table,
--           Transformation Rules, Data Quality Rules, Business Rules
```

### API Changes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/{id}/sttm` | GET | Get all mappings |
| `/api/documents/{id}/sttm` | POST | Add mapping row |
| `/api/documents/{id}/sttm/{mid}` | PUT | Update mapping |
| `/api/documents/{id}/sttm/{mid}` | DELETE | Delete mapping |
| `/api/documents/{id}/sttm/bulk` | POST | Bulk add mappings |
| `/api/documents/{id}/sttm/import` | POST | Import from CSV/Excel |
| `/api/documents/{id}/sttm/export` | GET | Export to CSV/Excel |
| `/api/documents/{id}/sttm/auto-detect` | POST | Detect from SQL files |
| `/api/documents/{id}/sttm/generate-doc` | POST | Generate narrative from mappings |

### Frontend Changes

1. **STTM Editor** (special document view)
   - Spreadsheet-like table (ag-grid or react-table)
   - Editable cells with validation
   - Column sorting and filtering
   - Row add/delete/reorder

2. **Import/Export**
   - Import CSV/Excel button
   - Column mapping modal
   - Export to CSV/Excel

3. **Auto-detect**
   - Scan repo for SQL files
   - Extract table/column references
   - Suggest mappings

4. **Generate Documentation**
   - Convert mappings to narrative
   - Include in document sections

---

## Phase 3: Multi-user Projects

**Goal**: Allow multiple users to collaborate on the same project.

### Database Changes

```sql
-- New: Project members
CREATE TABLE project_members (
    id UUID PRIMARY KEY,
    sdlc_project_id UUID REFERENCES sdlc_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'owner', 'editor', 'viewer'
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sdlc_project_id, user_id)
);
```

### API Changes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sdlc-projects/{id}/members` | GET | List project members |
| `/api/sdlc-projects/{id}/members` | POST | Add member |
| `/api/sdlc-projects/{id}/members/{uid}` | DELETE | Remove member |
| `/api/sdlc-projects/{id}/members/{uid}` | PATCH | Change role |

### Frontend Changes

1. **Project Members Panel**
   - Member list with roles
   - Add member button (owner only)
   - Remove member (owner only)
   - Role dropdown (owner only)

2. **Member Invitation**
   - Search users in org
   - Select role
   - Send invite

---

## Phase 4: Review Workflow

**Goal**: Document approval workflow with review states.

### Database Changes

```sql
-- Modify: Documents - add review status
ALTER TABLE documents ADD COLUMN review_status VARCHAR(30) DEFAULT 'draft';
-- Values: draft, pending_review, changes_requested, approved
ALTER TABLE documents ADD COLUMN assigned_reviewer_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN approved_at TIMESTAMP;

-- New: Document reviews
CREATE TABLE document_reviews (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL,  -- approved, rejected, changes_requested
    overall_comment TEXT,
    reviewed_at TIMESTAMP DEFAULT NOW()
);

-- New: Review comments (per section)
CREATE TABLE review_comments (
    id UUID PRIMARY KEY,
    review_id UUID REFERENCES document_reviews(id) ON DELETE CASCADE,
    document_section_id UUID REFERENCES document_sections(id),
    comment TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Workflow States

```
    ┌─────────────────────────────────────────┐
    │                                         │
    ▼                                         │
  DRAFT ──────► PENDING_REVIEW ──────► APPROVED
    ▲                 │
    │                 ▼
    │         CHANGES_REQUESTED
    │                 │
    └─────────────────┘
```

### API Changes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/{id}/submit-review` | POST | Submit for review |
| `/api/documents/{id}/assign-reviewer` | POST | Assign reviewer |
| `/api/documents/{id}/review` | POST | Submit review (approve/reject/changes) |
| `/api/documents/{id}/reviews` | GET | Get review history |
| `/api/documents/{id}/reviews/{rid}/comments` | GET | Get review comments |
| `/api/documents/{id}/reviews/{rid}/comments` | POST | Add comment |
| `/api/documents/{id}/reviews/{rid}/comments/{cid}/resolve` | POST | Resolve comment |

### Frontend Changes

1. **Review Status Badge**
   - Color-coded status
   - Click to see details

2. **Submit for Review**
   - Select reviewer dropdown
   - Add submission note
   - Submit button

3. **Review Interface**
   - Section-by-section review
   - Add comments to sections
   - Overall approve/reject/request changes
   - Comment threads

4. **Review History**
   - Timeline of reviews
   - View past comments
   - Resolution status

---

## Phase 5: Admin Template Library

**Goal**: Organization-level templates managed by admins.

### Database Changes

Already covered in Phase 1:
- `document_types.organization_id`
- `sections.organization_id`

Additional:
```sql
ALTER TABLE document_types ADD COLUMN is_org_default BOOLEAN DEFAULT FALSE;
ALTER TABLE document_types ADD COLUMN created_by UUID REFERENCES users(id);
```

### API Changes

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/templates?scope=system\|org\|all` | GET | Filter templates | Member |
| `/api/templates` | POST | Create org template | Admin |
| `/api/templates/{id}` | PUT | Update org template | Admin |
| `/api/templates/{id}` | DELETE | Delete org template | Admin |
| `/api/templates/{id}/set-default` | POST | Set as org default | Admin |
| `/api/sections?scope=system\|org\|all` | GET | Filter sections | Member |
| `/api/sections` | POST | Create org section | Admin |

### Frontend Changes

1. **Template Library Tabs**
   - System Templates (read-only)
   - Organization Templates (admin editable)

2. **Admin Controls** (visible to admins only)
   - Create template button
   - Edit/Delete buttons
   - Set as default toggle

3. **Section Library**
   - Same pattern as templates

---

## Phase 6: Connectors (Read-Only)

**Goal**: Import content from Jira, Confluence, Miro, SharePoint.

### Database Changes

```sql
-- New: Connectors
CREATE TABLE connectors (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,  -- jira, confluence, miro, sharepoint
    name VARCHAR(100) NOT NULL,
    config JSON NOT NULL,  -- encrypted credentials
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- New: Import history
CREATE TABLE connector_imports (
    id UUID PRIMARY KEY,
    connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    source_type VARCHAR(50),  -- jira_issue, confluence_page, miro_board, sharepoint_doc
    source_id VARCHAR(255),
    source_url VARCHAR(500),
    imported_content TEXT,
    imported_at TIMESTAMP DEFAULT NOW()
);
```

### Connector Configurations

```python
# Jira
{
    "host": "https://company.atlassian.net",
    "email": "user@company.com",
    "api_token": "encrypted_token",
    "default_project": "PROJ"
}

# Confluence
{
    "host": "https://company.atlassian.net/wiki",
    "email": "user@company.com",
    "api_token": "encrypted_token",
    "default_space": "DOCS"
}

# Miro
{
    "access_token": "encrypted_token",
    "team_id": "team123"
}

# SharePoint
{
    "tenant_id": "xxx",
    "client_id": "xxx",
    "client_secret": "encrypted_secret",
    "site_url": "https://company.sharepoint.com/sites/docs"
}
```

### API Changes

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/connectors` | GET | List org connectors | Member |
| `/api/connectors` | POST | Create connector | Admin |
| `/api/connectors/{id}` | PUT | Update connector | Admin |
| `/api/connectors/{id}` | DELETE | Delete connector | Admin |
| `/api/connectors/{id}/test` | POST | Test connection | Admin |
| `/api/connectors/{id}/jira/projects` | GET | List Jira projects | Member |
| `/api/connectors/{id}/jira/issues` | GET | Search issues | Member |
| `/api/connectors/{id}/confluence/spaces` | GET | List spaces | Member |
| `/api/connectors/{id}/confluence/pages` | GET | Search pages | Member |
| `/api/connectors/{id}/miro/boards` | GET | List boards | Member |
| `/api/connectors/{id}/sharepoint/sites` | GET | List sites | Member |
| `/api/connectors/{id}/sharepoint/documents` | GET | List documents | Member |
| `/api/documents/{id}/import` | POST | Import content | Editor |

### Frontend Changes

1. **Connector Settings** (admin only)
   - `/settings/connectors`
   - Add connector wizard
   - Test connection button
   - Enable/disable toggle

2. **Import Modal** (in document editor)
   - "Import from..." button
   - Select connector
   - Browse content (Jira issues, Confluence pages, etc.)
   - Preview content
   - Select and import

3. **Import History**
   - Show source reference
   - Re-import option

---

## Estimated Effort & Sequence

| Phase | Feature | Backend | Frontend | Total |
|-------|---------|---------|----------|-------|
| 1 | Multi-tenant Foundation | Large | Large | **Large** |
| 2a | Version Management | Medium | Medium | **Medium** |
| 2b | File-level Docs | Large | Medium | **Large** |
| 2c | STTM | Medium | Large | **Large** |
| 3 | Multi-user Projects | Small | Small | **Small** |
| 4 | Review Workflow | Medium | Large | **Large** |
| 5 | Admin Template Library | Small | Small | **Small** |
| 6 | Connectors | Large | Large | **Large** |

### Recommended Sequence

1. **Phase 1**: Multi-tenant Foundation (required for everything)
2. **Phase 2a**: Version Management (independent, high value)
3. **Phase 3**: Multi-user Projects (builds on Phase 1)
4. **Phase 5**: Admin Template Library (quick win after Phase 1)
5. **Phase 4**: Review Workflow (builds on Phase 3)
6. **Phase 2b**: File-level Docs (independent)
7. **Phase 2c**: STTM (independent, specialized)
8. **Phase 6**: Connectors (independent, complex)

---

## Technical Notes

### Migration Strategy
- Use Alembic for all database migrations
- Each phase should have its own migration script
- Include rollback migrations

### Security Considerations
- Encrypt connector credentials at rest
- Implement rate limiting for auth endpoints
- Add audit logging for admin actions
- Validate org membership on every request

### Testing Requirements
- Add pytest for backend (not currently present)
- Add Vitest for frontend
- Minimum 70% coverage for new code

### API Versioning
- Consider `/api/v2/` prefix for new endpoints
- Maintain backwards compatibility during transition
