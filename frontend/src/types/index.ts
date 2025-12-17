// User types
export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
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
