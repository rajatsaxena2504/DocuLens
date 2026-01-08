# DocuLens - AI-Powered SDLC Documentation Assistant

## Overview

DocuLens is a full-stack web application that automatically generates professional documentation for software projects across the entire Software Development Lifecycle (SDLC). It analyzes codebases from uploaded archives or GitHub repositories and uses AI to generate contextual documentation.

**Version**: 0.2.0
**License**: MIT
**Baseline Tag**: v0.2.0-baseline

## Implementation Progress

### Phase 1: Multi-tenant Foundation (COMPLETED)

**Status**: Complete (2026-01-07)

#### Backend Changes
- [x] Organization & OrganizationMember models (`app/models/organization.py`)
- [x] Alembic migrations 004 & 005 for new tables
- [x] User model updates (is_active, email_verified, last_login)
- [x] SDLCProject, DocumentType, Section models with organization_id
- [x] Organization API routes (`app/api/organizations.py`)
- [x] JWT authentication enabled in `app/api/deps.py`
- [x] Permission helpers: `require_org_membership`, `require_org_editor`, `require_org_admin`
- [x] SDLC routes updated with org-based permissions
- [x] Security module updated to use bcrypt directly (Python 3.13 fix)

#### Frontend Changes
- [x] AuthContext re-enabled with real JWT auth
- [x] Protected/Public routes in App.tsx
- [x] Organization pages: list, create, settings
- [x] OrgSwitcher component in sidebar
- [x] OrganizationContext for current org state
- [x] Types and API clients for organizations
- [x] useSDLCProjects hooks updated for org filtering

#### Test Data
- Seed script: `backend/scripts/seed_test_data.py`
- Test user: `test@doculens.local` / `testpassword123`
- Test org: "Test Organization" (`/test-org`)

### Phase 2a: Version Management (COMPLETED)

**Status**: Complete (2026-01-07)

#### Backend Changes
- [x] Migration 006: `document_versions` table
- [x] DocumentVersion model (`app/models/document_version.py`)
- [x] Version schemas in `app/schemas/document_version.py`
- [x] Document model: added `current_version` field
- [x] GeneratedContent model: added `modified_by`, `modified_at` fields
- [x] Version API endpoints in `app/api/documents.py`:
  - `GET /{id}/versions` - List all versions
  - `POST /{id}/versions` - Create new version snapshot
  - `GET /{id}/versions/{version_number}` - Get specific version
  - `POST /{id}/versions/compare` - Compare two versions
  - `POST /{id}/versions/restore` - Restore to a version

#### Frontend Changes
- [x] Version types in `types/index.ts`
- [x] Version API client in `api/documents.ts`
- [x] `useDocumentVersions` hook (`hooks/useDocumentVersions.ts`)
- [x] VersionPanel component (`components/editor/VersionPanel.tsx`)
- [x] VersionComparisonModal component (`components/editor/VersionComparisonModal.tsx`)
- [x] DocumentEditorPage: integrated version panel toggle button

#### Features
- Save document snapshots with optional change summary
- View version history with timestamps and creator
- Restore to any previous version (creates new version)
- Compare any two versions side-by-side
- Visual diff showing added/removed/modified sections

### Phase 2b: Advanced Versioning (PENDING)
- [ ] Auto-save versions on significant changes
- [ ] Branching support
- [ ] Merge functionality

### Phase 3: Multi-user Projects (COMPLETED)

**Status**: Complete (2026-01-07)

#### Backend Changes
- [x] Migration 007: `project_members` table
- [x] ProjectMember model (`app/models/project_member.py`)
- [x] Project member schemas in `app/schemas/sdlc.py`
- [x] SDLCProject model: added `members` relationship
- [x] User model: added `project_memberships` relationship
- [x] Member API endpoints in `app/api/sdlc_projects.py`:
  - `GET /{id}/members` - List project members
  - `POST /{id}/members` - Add member by email
  - `PATCH /{id}/members/{member_id}` - Update member role
  - `DELETE /{id}/members/{member_id}` - Remove member

#### Frontend Changes
- [x] ProjectMember types in `types/index.ts`
- [x] Member API client in `api/sdlcProjects.ts`
- [x] Member hooks in `hooks/useSDLCProjects.ts`
- [x] ProjectMembersPanel component (`components/project/ProjectMembersPanel.tsx`)
- [x] AddMemberModal component (`components/project/AddMemberModal.tsx`)
- [x] ProjectDetailPage: integrated members panel sidebar

#### Project Roles
- **owner**: Full access, manage members and project settings
- **editor**: Can edit documents and project settings
- **viewer**: Can only view documents

#### Features
- Add team members to projects by email
- Role-based access control (owner/editor/viewer)
- Change member roles (owner only)
- Remove members from project
- Leave project functionality
- Visual role badges with icons

### Phase 4: Review Workflow (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 008: Document review fields + `document_reviews` + `review_comments` tables
- [x] DocumentReview model (`app/models/document_review.py`)
- [x] ReviewComment model (`app/models/document_review.py`)
- [x] Document model: added `review_status`, `assigned_reviewer_id`, `submitted_at`, `approved_at`
- [x] Review schemas in `app/schemas/review.py`
- [x] Review API endpoints in `app/api/documents.py`:
  - `GET /{id}/review-status` - Get current review status
  - `POST /{id}/submit-review` - Submit document for review
  - `POST /{id}/assign-reviewer` - Assign reviewer
  - `POST /{id}/review` - Submit review decision
  - `GET /{id}/reviews` - List review history
  - `GET /{id}/reviews/{review_id}` - Get specific review
  - `POST /{id}/reviews/{review_id}/comments/{comment_id}/resolve` - Resolve comment

#### Frontend Changes
- [x] Review types in `types/index.ts`
- [x] Review API client in `api/documents.ts`
- [x] `useDocumentReviews` hooks (`hooks/useDocumentReviews.ts`)
- [x] ReviewPanel component (`components/editor/ReviewPanel.tsx`)

#### Review Workflow States
- **draft**: Document is being edited
- **pending_review**: Submitted for review, awaiting decision
- **changes_requested**: Reviewer requested changes
- **approved**: Document approved by reviewer

#### Features
- Submit documents for review with optional reviewer assignment
- Review with approve/reject/request changes decisions
- Section-level comments during review
- Comment resolution tracking
- Review history with timestamps

### Phase 5: Admin Template Library (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 009: `is_org_default` and `created_by` fields
- [x] Updated `app/api/templates.py`:
  - Scope filtering: `?scope=system|org|all`
  - Organization-aware template listing
  - `POST /` - Create org-level templates (admin only)
  - `PUT /{id}` - Update org templates (admin only)
  - `DELETE /{id}` - Delete org templates (admin only)
  - `POST /{id}/set-default` - Toggle org default status

#### Features
- System templates (read-only, available to all)
- Organization templates (admin-managed)
- Personal templates (user-created)
- Filter templates by scope
- Mark templates as organization default
- Admin-only template management

### Phase 6: External Connectors (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 010: `connectors` + `connector_imports` tables
- [x] Connector model (`app/models/connector.py`) - stores encrypted config
- [x] ConnectorImport model (`app/models/connector.py`) - tracks imported content
- [x] Document model: added `imports` relationship
- [x] Organization model: added `connectors` relationship
- [x] Connector schemas in `app/schemas/connector.py`
- [x] Connector API routes (`app/api/connectors.py`):
  - `GET /organization/{org_id}` - List connectors
  - `POST /organization/{org_id}` - Create connector (admin only)
  - `GET /{id}` - Get connector with config (admin only)
  - `PUT /{id}` - Update connector (admin only)
  - `DELETE /{id}` - Delete connector (admin only)
  - `POST /{id}/test` - Test connection
  - `GET /{id}/jira/projects` - List Jira projects
  - `GET /{id}/jira/projects/{key}/issues` - List Jira issues
  - `GET /{id}/confluence/spaces` - List Confluence spaces
  - `GET /{id}/confluence/spaces/{key}/pages` - List Confluence pages
  - `GET /{id}/content/{source_type}/{source_id}` - Fetch content preview
  - `POST /{id}/import/{document_id}` - Import content to document
  - `GET /{id}/imports` - List connector imports
  - `GET /document/{id}/imports` - List document imports

#### Frontend Changes
- [x] Connector types in `types/index.ts`
- [x] Connector API client in `api/connectors.ts`
- [x] `useConnectors` hooks (`hooks/useConnectors.ts`)
- [x] ConnectorsPanel component (`components/settings/ConnectorsPanel.tsx`)
- [x] Integrated into OrganizationSettingsPage as "Connectors" tab
- [x] Light theme styling with ConfirmModal for delete actions

#### Connector Types
- **Jira**: Import issues and user stories
- **Confluence**: Import pages and documentation
- **Miro**: Import boards and diagrams
- **SharePoint**: Import documents and files

#### Features
- Admin-only connector management
- Encrypted credential storage (JSON config)
- Connection testing with status feedback
- Browse external content (projects, spaces, pages)
- Import content into documents
- Import history tracking
- Last used timestamp tracking

### Phase 7: STTM - Source to Target Mapping (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 011: `sttm_mappings` table
- [x] STTMMapping model (`app/models/sttm_mapping.py`)
- [x] Document model: added `sttm_mappings` relationship
- [x] STTM schemas in `app/schemas/sttm.py`
- [x] STTM API routes (`app/api/sttm.py`):
  - `GET /documents/{id}/sttm` - List mappings with filters
  - `POST /documents/{id}/sttm` - Create mapping
  - `GET /documents/{id}/sttm/{mid}` - Get mapping
  - `PUT /documents/{id}/sttm/{mid}` - Update mapping
  - `DELETE /documents/{id}/sttm/{mid}` - Delete mapping
  - `POST /documents/{id}/sttm/bulk` - Bulk create mappings
  - `PATCH /documents/{id}/sttm/reorder` - Reorder mappings
  - `DELETE /documents/{id}/sttm` - Delete all mappings
  - `POST /documents/{id}/sttm/import` - Import from CSV data
  - `GET /documents/{id}/sttm/export` - Export to CSV
  - `GET /documents/{id}/sttm/summary` - Get statistics
  - `POST /documents/{id}/sttm/generate-doc` - Generate narrative

#### Frontend Changes
- [x] STTM types in `types/index.ts`
- [x] STTM API client in `api/sttm.ts`
- [x] `useSTTM` hooks (`hooks/useSTTM.ts`)
- [x] STTMEditor component (`components/editor/STTMEditor.tsx`)
- [x] Integrated into DocumentEditorPage with "STTM" toggle button
- [x] Light theme styling with ConfirmModal for delete actions

#### Transformation Types
- **direct**: 1:1 mapping, no transformation
- **derived**: Calculated from source columns
- **constant**: Static value
- **lookup**: Lookup from reference table
- **aggregate**: Aggregation (SUM, COUNT, etc.)
- **conditional**: CASE/IF logic

#### Features
- Spreadsheet-like mapping table
- Source/target column details
- Transformation type badges
- Expandable row details (logic, rules, notes)
- Export to CSV
- Generate narrative documentation
- Bulk operations (create, delete all)
- Summary statistics

### Phase 8: File-level Documentation (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 012: `file_path`, `is_file_level`, `file_type`, `file_analysis` fields
- [x] Document model: added file-level fields
- [x] FileAnalyzer service (`app/services/file_analyzer.py`):
  - Python analysis (AST-based)
  - SQL analysis (regex-based)
  - Jupyter notebook analysis (JSON parsing)
  - JavaScript/TypeScript analysis (regex-based)
- [x] File-level schemas in `app/schemas/file_doc.py`
- [x] Files API routes (`app/api/files.py`):
  - `GET /projects/{id}/files` - List files with filters
  - `GET /projects/{id}/files/tree` - File tree structure
  - `POST /projects/{id}/files/analyze` - Analyze file
  - `POST /documents/file-level` - Create file-level document
  - `GET /documents/{id}/file-info` - Get file document info
  - `POST /documents/{id}/analyze-file` - Analyze document's file
  - `GET /projects/{id}/file-documents` - List file documents
- [x] Files API supports both legacy Project and SDLCProject IDs
- [x] SDLCProject aggregates file trees from all connected repositories

#### Frontend Changes
- [x] File types in `types/index.ts`
- [x] Files API client in `api/files.ts`
- [x] `useFiles` hooks (`hooks/useFiles.ts`)
- [x] FileBrowser component (`components/files/FileBrowser.tsx`)
- [x] Integrated into ProjectDetailPage as collapsible "File-Level Documentation" section
- [x] Tree view navigation with folder expand/collapse
- [x] File type icons (Python, JS, TS, SQL, Jupyter)
- [x] Search/filter functionality
- [x] File analysis and document creation panels

#### Supported File Types
- **Python** (.py): Imports, functions, classes, docstrings, constants
- **SQL** (.sql): Tables, CTEs, joins, aggregations, statement types
- **Jupyter** (.ipynb): Cells, imports, visualizations, data sources
- **JavaScript/TypeScript** (.js, .jsx, .ts, .tsx): Imports, exports, functions, classes, hooks

#### Features
- File browser with tree structure
- Filter files by type
- Per-file analysis extraction
- File-level document creation
- Suggested sections based on file type
- Analysis data stored with document

### User Pages (COMPLETED)

**Status**: Complete (2026-01-08)

#### Frontend Changes
- [x] ProfilePage (`pages/ProfilePage.tsx`):
  - View account info (name, email, member since, status)
  - Edit display name
  - Change password form
- [x] SettingsPage (`pages/SettingsPage.tsx`):
  - Theme selection (light/dark/system)
  - Language preference
  - Notification settings (email, browser, document updates, review requests)
  - Editor settings (auto-save, spell check, line numbers)
  - Data export option
- [x] Updated Layout.tsx user menu with working links to `/profile` and `/settings`
- [x] Routes added in App.tsx

## Tech Stack

### Backend
- **Framework**: FastAPI 0.115+ with Uvicorn
- **ORM**: SQLAlchemy 2.0+ with Alembic migrations
- **Database**: SQLite (dev) / PostgreSQL 16+ (prod)
- **Authentication**: JWT (PyJWT) + bcrypt (ENABLED)
- **Multi-tenant**: Organization-based with role permissions
- **AI Providers** (priority order):
  1. Ollama/LM Studio (local, 300s timeout)
  2. Databricks Foundation Models
  3. Google Gemini
  4. Anthropic Claude

### Frontend
- **Framework**: React 18.2 + TypeScript 5.3
- **Build Tool**: Vite 5.0
- **Styling**: TailwindCSS 3.4 (coral/rose theme)
- **State**: React Context + React Query 5.17
- **Editor**: TipTap rich text editor
- **Animations**: Framer Motion 12.23

## Project Structure

```
doculens/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI route handlers
│   │   │   ├── auth.py       # Auth endpoints
│   │   │   ├── organizations.py  # Organization CRUD + members
│   │   │   ├── sdlc_projects.py  # SDLC project CRUD (org-scoped)
│   │   │   ├── projects.py   # Repository management
│   │   │   ├── documents.py  # Document CRUD + reviews
│   │   │   ├── sections.py   # Section library
│   │   │   ├── templates.py  # Template library
│   │   │   ├── generation.py # AI generation + export
│   │   │   ├── connectors.py # External integrations (Jira, Confluence)
│   │   │   ├── sttm.py       # Source-to-target mappings
│   │   │   ├── files.py      # File-level documentation
│   │   │   └── deps.py       # Dependencies + org permission helpers
│   │   ├── models/           # SQLAlchemy models
│   │   │   ├── organization.py  # Organization + OrganizationMember
│   │   │   ├── project_member.py  # ProjectMember
│   │   │   ├── document_version.py  # DocumentVersion
│   │   │   ├── document_review.py  # DocumentReview + ReviewComment
│   │   │   ├── connector.py  # Connector + ConnectorImport
│   │   │   ├── sttm_mapping.py  # STTMMapping
│   │   │   └── ...
│   │   ├── schemas/          # Pydantic schemas
│   │   │   ├── organization.py  # Org request/response schemas
│   │   │   ├── document_version.py  # Version schemas
│   │   │   ├── review.py     # Review + comment schemas
│   │   │   ├── connector.py  # Connector schemas
│   │   │   ├── sttm.py       # STTM mapping schemas
│   │   │   ├── file_doc.py   # File-level doc schemas
│   │   │   └── ...
│   │   ├── services/         # Business logic
│   │   │   ├── ai_service.py # Multi-provider AI
│   │   │   ├── code_analyzer.py # Codebase analysis
│   │   │   ├── document_generator.py
│   │   │   ├── section_suggester.py
│   │   │   ├── github_service.py
│   │   │   └── file_analyzer.py # File-level analysis (Python, SQL, JS)
│   │   ├── core/security.py  # JWT/bcrypt
│   │   ├── data/             # Seed data (templates, sections)
│   │   ├── config.py         # Settings
│   │   ├── database.py       # DB init
│   │   └── main.py           # FastAPI app
│   ├── scripts/
│   │   └── seed_test_data.py # Creates test user/org
│   ├── alembic/versions/
│   │   ├── 004_add_organizations.py
│   │   ├── 005_add_multitenant_fields.py
│   │   ├── 006_add_document_versions.py
│   │   ├── 007_add_project_members.py
│   │   ├── 008_add_review_workflow.py
│   │   ├── 009_add_template_admin_features.py
│   │   ├── 010_add_connectors.py
│   │   ├── 011_add_sttm_mappings.py
│   │   └── 012_add_file_level_docs.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios clients
│   │   │   ├── organizations.ts  # Org API
│   │   │   └── ...
│   │   ├── components/       # React components
│   │   │   ├── common/OrgSwitcher.tsx  # Org dropdown
│   │   │   ├── common/RoleBadges.tsx  # Multi-role badges
│   │   │   ├── editor/VersionPanel.tsx  # Document version panel
│   │   │   ├── editor/VersionComparisonModal.tsx  # Version diff modal
│   │   │   ├── editor/ReviewPanel.tsx  # Review workflow panel
│   │   │   ├── editor/STTMEditor.tsx  # STTM mapping editor
│   │   │   ├── files/FileBrowser.tsx  # File tree browser
│   │   │   ├── project/ProjectMembersPanel.tsx  # Project team panel
│   │   │   ├── project/AddMemberModal.tsx  # Add member modal
│   │   │   ├── settings/ConnectorsPanel.tsx  # External connectors management
│   │   │   └── ...
│   │   ├── context/          # Auth, Project, Session, Organization contexts
│   │   │   ├── OrganizationContext.tsx  # Current org state
│   │   │   └── ...
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useDocumentVersions.ts  # Version management hooks
│   │   │   ├── useDocumentReviews.ts  # Review workflow hooks
│   │   │   ├── useConnectors.ts  # Connector management hooks
│   │   │   ├── useSTTM.ts    # STTM mapping hooks
│   │   │   ├── useFiles.ts   # File browsing hooks
│   │   │   └── ...
│   │   ├── pages/            # Page components
│   │   │   ├── OrganizationsPage.tsx
│   │   │   ├── CreateOrganizationPage.tsx
│   │   │   ├── OrganizationSettingsPage.tsx
│   │   │   ├── ProfilePage.tsx  # User profile management
│   │   │   ├── SettingsPage.tsx  # App settings
│   │   │   └── ...
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── setup-local.sh
├── run-local.sh
├── CLAUDE.md              # This file
├── IMPLEMENTATION_PLAN.md # Full 7-phase plan
└── README.md
```

## Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| User | users | User accounts with auth |
| Organization | organizations | Multi-tenant orgs |
| OrganizationMember | organization_members | User-org membership + role |
| SDLCProject | sdlc_projects | Main project container (org-scoped) |
| ProjectMember | project_members | User-project membership + role |
| Project | projects | Repositories linked to SDLC projects |
| Document | documents | Generated documentation |
| DocumentSection | document_sections | Sections within a document |
| Section | sections | Reusable section library (org-scoped) |
| DocumentType | document_types | Document templates (org-scoped) |
| DocumentTypeSection | document_type_sections | Template-section mappings |
| SDLCStage | sdlc_stages | 6 lifecycle stages |
| GeneratedContent | generated_content | AI-generated content with versioning |
| DocumentVersion | document_versions | Document version snapshots |
| DocumentReview | document_reviews | Review decisions and comments |
| ReviewComment | review_comments | Section-level review comments |
| Connector | connectors | External service integrations |
| ConnectorImport | connector_imports | Imported content tracking |
| STTMMapping | sttm_mappings | Source-to-target data mappings |

### System-Wide Role (Superadmin)
- **superadmin**: System-wide access, can create orgs, manage all orgs, system-wide deployments

### Organization Roles (Multi-role/Additive)
Users can have MULTIPLE roles per organization:
- **owner**: Full org access, manage members, settings, approve membership requests
- **editor**: Create and edit projects and documents
- **reviewer**: Approve/reject documents, add review comments
- **viewer**: Read-only access to projects and documents

### Access Control Matrix
| Feature | Superadmin | Owner | Editor | Reviewer | Viewer |
|---------|------------|-------|--------|----------|--------|
| Create Organization | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Org Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Join Requests | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create/Edit Projects | ✅ | ✅ | ✅ | ❌ | ❌ |
| Review Documents | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Projects | ✅ | ✅ | ✅ | ✅ | ✅ |

### Project Roles
- **owner**: Full project access, manage members
- **editor**: Can edit documents and project settings
- **viewer**: Read-only access to project documents

---

### Phase 9: 4-Level Role System Restructure (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 013: `is_superadmin` on users, boolean role columns on org_members
- [x] User model: added `is_superadmin` boolean
- [x] OrganizationMember model: added `is_admin`, `is_editor`, `is_reviewer`, `is_viewer` boolean columns
- [x] OrganizationMember model: added `roles`, `primary_role`, `can_edit()`, `can_review()` helpers
- [x] Updated `app/api/deps.py`:
  - `require_superadmin()` helper
  - `_create_superadmin_membership()` for synthetic full-access
  - All `check_org_*` functions now handle superadmin bypass
- [x] Updated `app/schemas/organization.py`:
  - `OrganizationMemberRoles` - boolean flags for additive roles
  - `OrganizationMemberCreate/Update` - supports both legacy role and new roles object
  - `OrganizationMemberResponse` - returns `roles` array and `primary_role`
- [x] Updated `app/api/organizations.py` for multi-role support
- [x] Created `app/api/admin.py` for superadmin operations:
  - `GET /admin/users` - List all users
  - `POST /admin/users/{id}/superadmin` - Grant superadmin by ID
  - `POST /admin/users/superadmin` - Grant superadmin by email
  - `DELETE /admin/users/{id}/superadmin` - Revoke superadmin
  - `GET /admin/organizations` - List all organizations
  - `POST /admin/organizations` - Create org with initial admin
  - `DELETE /admin/organizations/{id}` - Delete organization
- [x] Registered admin router in `app/main.py`

#### Frontend Changes
- [x] Updated `types/index.ts`:
  - Added `is_superadmin` to User type
  - Added `reviewer` to OrganizationRole
  - Added `OrganizationRoles` interface (boolean flags)
  - Updated `OrganizationMember` with `roles` array and `primary_role`
  - Added admin API types
- [x] Updated `context/AuthContext.tsx`:
  - Added `isSuperadmin` boolean to context
- [x] Updated `context/OrganizationContext.tsx`:
  - Added `currentRoles` array (multi-role)
  - Added `isReviewer`, `canReview` computed values
  - Multi-role array checks for permissions
- [x] Created `api/admin.ts` - Admin API client
- [x] Created `components/common/RoleBadges.tsx`:
  - `RoleBadge` - Single role badge with color
  - `RoleBadges` - Multiple badges with overflow indicator
  - `SuperadminBadge` - System-wide superadmin badge
- [x] Created `pages/AdminPage.tsx`:
  - Organizations tab: list, create with admin, delete
  - Users tab: list, grant/revoke superadmin
  - Protected by superadmin check
- [x] Updated `pages/OrganizationSettingsPage.tsx`:
  - Multi-role checkbox selection for invite
  - Multi-role checkbox selection for role edit modal
  - RoleBadges display for members
  - Updated role descriptions to include reviewer
- [x] Updated `components/common/Layout.tsx`:
  - Admin Dashboard link in user menu (superadmin only)
- [x] Updated `components/common/OrgSwitcher.tsx`:
  - Uses RoleBadges for role display
- [x] Added `/admin` route in `App.tsx`

#### Role System Design
- **Superadmin** = system-wide flag on User (not per-org membership)
- **Additive roles** = users can be editor + reviewer simultaneously
- **Reviewer** separate from Viewer (reviewer can approve, viewer is read-only)
- **Backwards compatible** = legacy `role` field still works alongside new `roles` object
- **First user** set as superadmin via migration

#### Key Features
- Superadmins create orgs and assign owners, then step back
- Org owners manage day-to-day org operations
- Multi-role selection with checkboxes (not single dropdown)
- Role badges with color coding and overflow indicator
- Superadmin dashboard at `/admin`

### Phase 9b: Membership Requests & Access Control (COMPLETED)

**Status**: Complete (2026-01-08)

#### Backend Changes
- [x] Migration 014: `membership_requests` table
- [x] MembershipRequest model (`app/models/organization.py`)
- [x] Membership request schemas in `app/schemas/organization.py`
- [x] Membership request API endpoints in `app/api/organizations.py`:
  - `GET /all/public` - List all organizations (for join dropdown)
  - `GET /requests/my` - List user's pending requests
  - `POST /requests` - Create membership request
  - `DELETE /requests/{id}` - Cancel pending request
  - `GET /{org_id}/requests` - List org's pending requests (owner only)
  - `POST /{org_id}/requests/{id}/review` - Approve/reject request (owner only)

#### Frontend Changes
- [x] Membership request API in `api/organizations.ts`
- [x] OrganizationsPage: "Request to Join" button and modal
- [x] OrganizationsPage: Pending requests display
- [x] OrganizationSettingsPage: "Requests" tab for owners
- [x] ProfilePage: Shows "Not a member" state with join link
- [x] Access control on all org-related pages:
  - CreateOrganizationPage: Superadmin only
  - OrganizationSettingsPage: Owner/Superadmin only
  - OrgSwitcher: Conditional links based on role

#### Membership Request Flow
1. New user registers and sees "Join Organization" CTA
2. User browses public organizations and sends join request
3. Pending request shown on user's Organizations page
4. Org owner sees request in Settings → Requests tab
5. Owner approves → User added as Viewer
6. Owner can then change roles in Members tab

---

## Key Features

1. **SDLC Project Management**: Organize projects by lifecycle stage
2. **Multi-Repository Support**: Link frontend, backend, API repos to one project
3. **Code Analysis**: Auto-detect languages, frameworks, dependencies
4. **Template Library**: 30+ pre-built templates across all SDLC stages
5. **Section Library**: 50+ reusable sections with central editing
6. **AI Generation**: Multi-provider support with fallback chain
7. **Rich Editor**: TipTap-based editing with section reordering
8. **Export**: Markdown, DOCX, PDF formats

## API Routes

### Authentication (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - Login and get JWT token
- `GET /me` - Get current user info
- `POST /refresh` - Refresh JWT token

### Organizations (`/api/organizations`)
- `GET /` - List user's organizations (with role)
- `POST /` - Create organization (auto admin)
- `GET /{id}` - Get organization detail
- `PUT /{id}` - Update organization (admin only)
- `DELETE /{id}` - Delete organization (admin only)
- `GET /{id}/members` - List members
- `POST /{id}/members` - Add member by email
- `PUT /{id}/members/{member_id}` - Update member role
- `DELETE /{id}/members/{member_id}` - Remove member
- `POST /{id}/leave` - Leave organization

### SDLC Projects (`/api/sdlc-projects`)
- `GET /stages` - List SDLC stages
- `POST /` - Create project (auto-links to current org)
- `GET /` - List projects (filtered by org)
- `GET /{id}` - Get project detail
- `POST /{id}/repositories` - Add repository (editor+)
- `GET /{id}/members` - List project members
- `POST /{id}/members` - Add member by email (owner only)
- `PATCH /{id}/members/{member_id}` - Update member role (owner only)
- `DELETE /{id}/members/{member_id}` - Remove member (owner only)

### Documents (`/api/documents`)
- `POST /` - Create document from template
- `GET /{id}` - Get document with sections
- `PATCH /{id}/sections/{section_id}` - Update section
- `PATCH /{id}/reorder-sections` - Reorder sections
- `GET /{id}/versions` - List all versions
- `POST /{id}/versions` - Create version snapshot
- `GET /{id}/versions/{version_number}` - Get specific version
- `POST /{id}/versions/compare` - Compare two versions
- `POST /{id}/versions/restore` - Restore to a version

### Generation (`/api/generation`)
- `POST /documents/{id}/generate` - Generate all sections
- `POST /documents/{id}/sections/{section_id}/generate` - Regenerate section
- `GET /documents/{id}/export?format=markdown|docx|pdf` - Export

### Templates (`/api/templates`)
- `GET /library/with-sections` - Template library view
- `POST /` - Create custom template

### Sections (`/api/sections`)
- `GET /library/with-templates` - Section library view
- `PATCH /{id}/description` - Central description edit

## Environment Variables

```bash
# Database
DATABASE_URL=sqlite:///./doculens.db

# Security
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Providers (configure at least one)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

DATABRICKS_HOST=https://workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-token

GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-2.0-flash

ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-3-haiku-20240307

# Optional
GITHUB_TOKEN=for-private-repos
VITE_API_URL=http://localhost:8000
```

## Running Locally

```bash
# One-time setup
./setup-local.sh

# Start development servers
./run-local.sh
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

## Key Services

### AIService (`backend/app/services/ai_service.py`)
Unified multi-provider AI interface. Tries providers in priority order:
1. Ollama (local) - 300s timeout for slow models
2. Databricks
3. Gemini
4. Anthropic
5. Placeholder fallback

### CodeAnalyzer (`backend/app/services/code_analyzer.py`)
Analyzes repositories for:
- Language detection (20+ languages)
- Framework identification
- Dependency extraction
- Project structure mapping
- Config file parsing

### DocumentGenerator (`backend/app/services/document_generator.py`)
Orchestrates document generation:
- Aggregates multi-repo context
- Generates sections sequentially
- Saves with version tracking
- Handles regeneration with custom prompts

## Authentication Status

**ENABLED** - JWT authentication is active.

### Test Credentials
- **Email**: `test@doculens.local`
- **Password**: `testpassword123`
- **Organization**: Test Organization (`/test-org`)

### Creating Test Data
```bash
cd backend
source .venv/bin/activate
python scripts/seed_test_data.py
```

## SDLC Stages (Seeded)

| Stage | Icon | Color |
|-------|------|-------|
| Requirements | clipboard-list | violet |
| Design | drafting-compass | blue |
| Development | code | emerald |
| Testing | flask-conical | amber |
| Deployment | rocket | rose |
| Maintenance | wrench | slate |

## Document Generation Flow

1. User creates SDLC project and adds repositories
2. Creates document from template for a stage
3. System analyzes code from linked repos
4. AI suggests relevant sections based on analysis
5. User reviews and selects sections
6. Submits for generation
7. Each section generated with repo context + section prompt
8. Content saved with version tracking
9. User can regenerate sections with custom prompts
10. Export to Markdown/DOCX/PDF

## Testing

No testing framework configured. Consider adding pytest for backend and Vitest for frontend.

## Common Tasks

### Adding a new document template
1. Add to `backend/app/data/document_types.json`
2. Run database seed: `python -m app.data.seed`

### Adding a new section
1. Add to `backend/app/data/section_library.json`
2. Run database seed

### Adding a new AI provider
1. Add client initialization in `AIService.__init__()`
2. Add generation method (e.g., `_generate_with_newprovider()`)
3. Add to provider priority list in `generate_content()`

### Modifying section generation prompts
Edit the prompt template in `AIService.generate_section_content()` or update section descriptions in the section library.
