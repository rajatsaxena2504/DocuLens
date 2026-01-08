// User types
export interface User {
  id: string
  email: string
  name: string | null
  is_active: boolean
  email_verified: boolean
  is_superadmin: boolean
  last_login: string | null
  created_at: string
}

// Organization types
export type OrganizationRole = 'owner' | 'editor' | 'reviewer' | 'viewer'
export type OrganizationRoleName = OrganizationRole  // Alias for clarity

// Multi-role support - boolean flags for additive roles
export interface OrganizationRoles {
  is_owner: boolean
  is_editor: boolean
  is_reviewer: boolean
  is_viewer: boolean
}

export interface Organization {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id?: string
  user_id: string
  // Multi-role support
  roles: OrganizationRole[]  // Array of all roles
  primary_role: OrganizationRole  // Highest privilege role
  role: OrganizationRole  // Legacy field for backwards compatibility
  joined_at: string
  user_email?: string
  user_name?: string | null
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

export interface OrganizationWithRole extends Organization {
  // Multi-role support
  roles: OrganizationRole[]  // Array of all roles
  primary_role: OrganizationRole  // Highest privilege role
  role: OrganizationRole  // Legacy field
  member_count?: number
}

export interface OrganizationDetail extends Organization {
  member_count: number
  project_count: number
}

export interface CreateOrganizationRequest {
  name: string
  slug?: string
  settings?: Record<string, unknown>
}

export interface UpdateOrganizationRequest {
  name?: string
  settings?: Record<string, unknown>
}

export interface InviteMemberRequest {
  email: string
  // Support both legacy single role and new multi-role
  role?: OrganizationRole  // Legacy
  roles?: OrganizationRoles  // New multi-role
}

export interface UpdateMemberRoleRequest {
  // Support both legacy single role and new multi-role
  role?: OrganizationRole  // Legacy
  roles?: OrganizationRoles  // New multi-role
}

// ============ Admin API Types (Superadmin) ============

export interface AdminUserResponse {
  id: string
  email: string
  name: string | null
  is_active: boolean
  is_superadmin: boolean
  created_at: string
}

export interface AdminOrganizationResponse {
  id: string
  name: string
  slug: string
  member_count: number
  created_at: string
}

export interface CreateOrganizationWithOwnerRequest {
  name: string
  slug?: string
  owner_email: string
}

export interface GrantSuperadminRequest {
  email: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

// ============ SDLC Types ============

export interface SDLCStage {
  id: string
  name: string
  description: string | null
  display_order: number
  icon: string | null
  color: string | null
}

export interface SDLCProject {
  id: string
  name: string
  description: string | null
  status: 'active' | 'archived'
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface SDLCProjectWithRepositories extends SDLCProject {
  repositories: Repository[]
}

export interface SDLCProjectDetail extends SDLCProjectWithRepositories {
  stage_document_counts?: Record<string, number>
}

export interface Repository {
  id: string
  name: string
  description: string | null
  source_type: 'upload' | 'github'
  repo_type: string | null  // 'frontend', 'backend', 'api', etc.
  github_url: string | null
  analysis_data: CodeAnalysis | null
  created_at: string
  updated_at: string
}

// ============ SDLC Request Types ============

export interface CreateSDLCProjectRequest {
  name: string
  description?: string
  organization_id?: string
}

export interface UpdateSDLCProjectRequest {
  name?: string
  description?: string
  status?: 'active' | 'archived'
}

export interface AddRepositoryRequest {
  github_url: string
  name?: string
  description?: string
  repo_type?: string
}

export interface UpdateRepositoryRequest {
  name?: string
  description?: string
  repo_type?: string
}

// ============ Legacy Project Types (now Repository) ============

// Project types (kept for backward compatibility, represents a single repository)
export interface Project {
  id: string
  name: string
  description: string | null
  source_type: 'upload' | 'github'
  github_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectWithAnalysis extends Project {
  analysis_data: CodeAnalysis | null
}

export interface CodeAnalysis {
  file_tree: string[]
  languages: Record<string, number>
  config_files: string[]
  entry_points: string[]
  structure: {
    total_files: number
    total_dirs: number
    total_lines: number
  }
  key_files: Array<{
    path: string
    type: string
    name: string
  }>
  dependencies: Record<string, string[] | Record<string, string[]>>
  primary_language: string
}

// Document type/template types
export interface DocumentType {
  id: string
  name: string
  description: string | null
  is_system: boolean
  stage_id: string | null
  created_at: string
}

export interface DocumentTypeWithSections extends DocumentType {
  default_sections: Section[]
}

// Section types
export interface Section {
  id: string
  name: string
  description: string
  default_order: number | null
  is_system: boolean
  created_at: string
}

export interface SectionSuggestion {
  section_id: string | null
  name: string
  description: string
  relevance_score: number
  reason: string
  is_custom: boolean
}

// Document types
export interface Document {
  id: string
  project_id: string | null  // Repository ID (may be null in SDLC flow)
  sdlc_project_id: string | null  // SDLC Project ID
  document_type_id: string | null
  stage_id: string | null
  title: string
  status: 'draft' | 'sections_approved' | 'generating' | 'completed'
  current_version: number
  created_at: string
  updated_at: string
}

export interface DocumentSection {
  id: string
  section_id: string | null
  custom_title: string | null
  custom_description: string | null
  display_order: number
  is_included: boolean
  title: string
  description: string
  content: string | null
}

export interface DocumentWithSections extends Document {
  sections: DocumentSection[]
}

// API request types
export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface GitHubProjectRequest {
  github_url: string
  name?: string
  description?: string
}

export interface CreateDocumentRequest {
  project_id: string
  document_type_id?: string
  stage_id?: string
  title: string
}

export interface UpdateDocumentRequest {
  title?: string
  status?: string
}

export interface CreateSectionRequest {
  section_id?: string
  custom_title?: string
  custom_description?: string
  display_order: number
}

export interface UpdateSectionRequest {
  custom_title?: string
  custom_description?: string
  is_included?: boolean
}

export interface ReorderSectionsRequest {
  section_orders: Array<{ id: string; display_order: number }>
}

// ============ Version Management Types ============

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  change_summary: string | null
  created_by: string | null
  created_at: string
  creator_name: string | null
}

export interface DocumentVersionDetail extends DocumentVersion {
  snapshot: DocumentSnapshot
}

export interface DocumentSnapshot {
  title: string
  status: string
  document_type_id: string | null
  stage_id: string | null
  sections: SectionSnapshot[]
}

export interface SectionSnapshot {
  section_id: string
  library_section_id: string | null
  custom_title: string | null
  custom_description: string | null
  display_order: number
  is_included: boolean
  title: string
  description: string
  content: string | null
}

export interface DocumentVersionList {
  versions: DocumentVersion[]
  total: number
  current_version: number
}

export interface CreateVersionRequest {
  change_summary?: string
}

export interface CompareVersionsRequest {
  from_version: number
  to_version: number
}

export interface SectionDiff {
  section_id: string
  section_title: string
  change_type: 'added' | 'removed' | 'modified' | 'unchanged'
  old_content: string | null
  new_content: string | null
}

export interface VersionComparison {
  document_id: string
  from_version: number
  to_version: number
  from_timestamp: string
  to_timestamp: string
  section_diffs: SectionDiff[]
  summary: string
}

export interface RestoreVersionRequest {
  version_number: number
  change_summary?: string
}

// ============ Project Member Types ============

export type ProjectRole = 'owner' | 'editor' | 'viewer'

export interface ProjectMember {
  id: string
  sdlc_project_id: string
  user_id: string
  role: ProjectRole
  added_at: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

export interface AddProjectMemberRequest {
  email: string
  role: ProjectRole
}

export interface UpdateProjectMemberRequest {
  role: ProjectRole
}

// ============ Review Workflow Types ============

export type ReviewStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved'
export type ReviewDecision = 'approved' | 'rejected' | 'changes_requested'

export interface PendingReviewDocument {
  id: string
  title: string
  status: string
  review_status: ReviewStatus
  submitted_at: string | null
  assigned_to_me: boolean
  project: {
    id: string | null
    name: string | null
  }
  submitter: {
    id: string | null
    name: string | null
    email: string | null
  } | null
}

export interface ApprovedDocument {
  id: string
  title: string
  status: string
  review_status: ReviewStatus
  approved_at: string | null
  current_version: number
  project: {
    id: string | null
    name: string | null
  }
  owner: {
    id: string | null
    name: string | null
    email: string | null
  } | null
}

export interface ReviewerInfo {
  id: string
  email: string
  name: string | null
}

export interface ReviewComment {
  id: string
  review_id: string
  document_section_id: string | null
  comment: string
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_by: string | null
  created_at: string
  creator: ReviewerInfo | null
  section_title: string | null
}

export interface DocumentReview {
  id: string
  document_id: string
  reviewer_id: string | null
  version_number: number | null
  status: ReviewDecision
  overall_comment: string | null
  reviewed_at: string
  reviewer: ReviewerInfo | null
  comments: ReviewComment[]
}

export interface DocumentReviewSummary {
  id: string
  document_id: string
  reviewer_id: string | null
  version_number: number | null
  status: ReviewDecision
  overall_comment: string | null
  reviewed_at: string
  reviewer: ReviewerInfo | null
  comment_count: number
  unresolved_count: number
}

export interface ReviewStatusResponse {
  review_status: ReviewStatus
  assigned_reviewer: ReviewerInfo | null
  submitted_at: string | null
  approved_at: string | null
  latest_review: DocumentReviewSummary | null
  total_reviews: number
  pending_comments: number
}

export interface SubmitForReviewRequest {
  reviewer_id?: string
  note?: string
}

export interface AssignReviewerRequest {
  reviewer_id: string
}

export interface ReviewCommentCreate {
  document_section_id?: string
  comment: string
}

export interface SubmitReviewRequest {
  status: ReviewDecision
  overall_comment?: string
  comments?: ReviewCommentCreate[]
}

// ============ Connector Types ============

export type ConnectorType = 'jira' | 'confluence' | 'miro' | 'sharepoint'

export interface Connector {
  id: string
  organization_id: string
  type: ConnectorType
  name: string
  is_active: boolean
  created_by: string | null
  created_at: string
  last_used_at: string | null
}

export interface ConnectorWithConfig extends Connector {
  config: Record<string, unknown>
}

export interface ConnectorImport {
  id: string
  connector_id: string
  document_id: string
  source_type: string | null
  source_id: string | null
  source_url: string | null
  imported_at: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  details: Record<string, unknown> | null
}

export interface JiraProject {
  id: string
  key: string
  name: string
}

export interface JiraIssue {
  id: string
  key: string
  summary: string
  type: string
  status: string
  description: string | null
}

export interface ConfluenceSpace {
  id: string
  key: string
  name: string
}

export interface ConfluencePage {
  id: string
  title: string
  space_key: string
  excerpt: string | null
}

export interface ExternalContent {
  id: string
  title: string
  content: string
  source_type: string
  source_url: string | null
  metadata: Record<string, unknown> | null
}

export interface CreateConnectorRequest {
  type: ConnectorType
  name: string
  config: Record<string, unknown>
}

export interface UpdateConnectorRequest {
  name?: string
  config?: Record<string, unknown>
  is_active?: boolean
}

export interface ImportContentRequest {
  source_type: string
  source_id: string
  source_url?: string
}

// ============ STTM (Source to Target Mapping) Types ============

export type TransformationType = 'direct' | 'derived' | 'constant' | 'lookup' | 'aggregate' | 'conditional'

export interface STTMMapping {
  id: string
  document_id: string
  source_system: string | null
  source_table: string | null
  source_column: string | null
  source_datatype: string | null
  target_system: string | null
  target_table: string | null
  target_column: string | null
  target_datatype: string | null
  transformation_logic: string | null
  transformation_type: TransformationType | null
  business_rule: string | null
  is_key: boolean
  is_nullable: boolean
  default_value: string | null
  notes: string | null
  display_order: number
  created_at: string
  updated_at: string | null
}

export interface CreateSTTMMappingRequest {
  source_system?: string
  source_table?: string
  source_column?: string
  source_datatype?: string
  target_system?: string
  target_table?: string
  target_column?: string
  target_datatype?: string
  transformation_logic?: string
  transformation_type?: TransformationType
  business_rule?: string
  is_key?: boolean
  is_nullable?: boolean
  default_value?: string
  notes?: string
  display_order?: number
}

export interface UpdateSTTMMappingRequest {
  source_system?: string
  source_table?: string
  source_column?: string
  source_datatype?: string
  target_system?: string
  target_table?: string
  target_column?: string
  target_datatype?: string
  transformation_logic?: string
  transformation_type?: TransformationType
  business_rule?: string
  is_key?: boolean
  is_nullable?: boolean
  default_value?: string
  notes?: string
  display_order?: number
}

export interface STTMBulkCreateRequest {
  mappings: CreateSTTMMappingRequest[]
}

export interface STTMReorderRequest {
  mapping_orders: { id: string; display_order: number }[]
}

export interface STTMSummary {
  total_mappings: number
  source_systems: string[]
  target_systems: string[]
  transformation_types: Record<string, number>
  key_columns: number
  nullable_columns: number
}

export interface STTMImportRequest {
  data: Record<string, string>[]
  column_mapping?: Record<string, string>
}

export interface STTMGenerateDocRequest {
  include_sections?: string[]
  format?: 'markdown' | 'html'
}

export interface STTMGenerateDocResponse {
  content: string
  sections: Record<string, string>
}

// ============ File-level Documentation Types ============

export type FileType = 'python' | 'sql' | 'ipynb' | 'javascript' | 'typescript'

export interface FileInfo {
  path: string
  name: string
  extension: string
  size: number
  is_directory: boolean
  file_type: FileType | null
}

export interface FileTreeNode {
  path: string
  name: string
  is_directory: boolean
  children: FileTreeNode[] | null
  file_type: FileType | null
}

export interface FunctionAnalysis {
  name: string
  args: string[]
  docstring: string | null
  decorators: string[]
  returns: string | null
  line_number: number
  is_async: boolean
}

export interface ClassAnalysis {
  name: string
  bases: string[]
  docstring: string | null
  methods: string[]
  line_number: number
}

export interface FileAnalysis {
  file_path: string
  file_type: string
  [key: string]: unknown
}

export interface FileAnalysisResponse {
  file_path: string
  file_type: string
  analysis: FileAnalysis
  suggested_sections: string[]
}

export interface FileDocumentResponse {
  id: string
  file_path: string
  file_type: string | null
  is_file_level: boolean
  title: string
  status: string
  file_analysis: FileAnalysis | null
  created_at: string
}

export interface CreateFileDocumentRequest {
  project_id?: string
  sdlc_project_id?: string
  stage_id?: string
  file_path: string
  title?: string
  document_type_id?: string
}

export interface AnalyzeFileRequest {
  file_path: string
}
