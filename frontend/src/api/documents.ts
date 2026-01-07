import client from './client'
import type {
  Document,
  DocumentWithSections,
  DocumentSection,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  ReorderSectionsRequest,
  SectionSuggestion,
  DocumentVersion,
  DocumentVersionDetail,
  DocumentVersionList,
  CreateVersionRequest,
  CompareVersionsRequest,
  VersionComparison,
  RestoreVersionRequest,
  ReviewStatusResponse,
  DocumentReview,
  DocumentReviewSummary,
  SubmitForReviewRequest,
  AssignReviewerRequest,
  SubmitReviewRequest,
} from '@/types'

export const documentsApi = {
  list: async (projectId?: string): Promise<Document[]> => {
    const response = await client.get<Document[]>('/documents', {
      params: projectId ? { project_id: projectId } : undefined,
    })
    return response.data
  },

  get: async (id: string): Promise<DocumentWithSections> => {
    const response = await client.get<DocumentWithSections>(`/documents/${id}`)
    return response.data
  },

  create: async (data: CreateDocumentRequest): Promise<Document> => {
    const response = await client.post<Document>('/documents', data)
    return response.data
  },

  update: async (id: string, data: UpdateDocumentRequest): Promise<Document> => {
    const response = await client.put<Document>(`/documents/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/documents/${id}`)
  },

  // Section suggestions
  getSuggestions: async (id: string): Promise<SectionSuggestion[]> => {
    const response = await client.get<SectionSuggestion[]>(`/documents/${id}/suggestions`)
    return response.data
  },

  // Sections management
  getSections: async (id: string): Promise<DocumentSection[]> => {
    const response = await client.get<DocumentSection[]>(`/documents/${id}/sections`)
    return response.data
  },

  addSection: async (documentId: string, data: CreateSectionRequest): Promise<DocumentSection> => {
    const response = await client.post<DocumentSection>(`/documents/${documentId}/sections`, data)
    return response.data
  },

  updateSection: async (
    documentId: string,
    sectionId: string,
    data: UpdateSectionRequest
  ): Promise<DocumentSection> => {
    const response = await client.put<DocumentSection>(
      `/documents/${documentId}/sections/${sectionId}`,
      data
    )
    return response.data
  },

  deleteSection: async (documentId: string, sectionId: string): Promise<void> => {
    await client.delete(`/documents/${documentId}/sections/${sectionId}`)
  },

  reorderSections: async (documentId: string, data: ReorderSectionsRequest): Promise<void> => {
    await client.post(`/documents/${documentId}/sections/reorder`, data)
  },

  updateSectionContent: async (
    documentId: string,
    sectionId: string,
    content: string
  ): Promise<DocumentSection> => {
    const response = await client.put<DocumentSection>(
      `/documents/${documentId}/sections/${sectionId}/content`,
      null,
      { params: { content } }
    )
    return response.data
  },

  // Version management
  listVersions: async (documentId: string): Promise<DocumentVersionList> => {
    const response = await client.get<DocumentVersionList>(
      `/documents/${documentId}/versions`
    )
    return response.data
  },

  createVersion: async (
    documentId: string,
    data: CreateVersionRequest
  ): Promise<DocumentVersion> => {
    const response = await client.post<DocumentVersion>(
      `/documents/${documentId}/versions`,
      data
    )
    return response.data
  },

  getVersion: async (
    documentId: string,
    versionNumber: number
  ): Promise<DocumentVersionDetail> => {
    const response = await client.get<DocumentVersionDetail>(
      `/documents/${documentId}/versions/${versionNumber}`
    )
    return response.data
  },

  compareVersions: async (
    documentId: string,
    data: CompareVersionsRequest
  ): Promise<VersionComparison> => {
    const response = await client.post<VersionComparison>(
      `/documents/${documentId}/versions/compare`,
      data
    )
    return response.data
  },

  restoreVersion: async (
    documentId: string,
    data: RestoreVersionRequest
  ): Promise<DocumentVersion> => {
    const response = await client.post<DocumentVersion>(
      `/documents/${documentId}/versions/restore`,
      data
    )
    return response.data
  },

  // Review workflow
  getReviewStatus: async (documentId: string): Promise<ReviewStatusResponse> => {
    const response = await client.get<ReviewStatusResponse>(
      `/documents/${documentId}/review-status`
    )
    return response.data
  },

  submitForReview: async (
    documentId: string,
    data: SubmitForReviewRequest
  ): Promise<{ message: string; review_status: string; submitted_at: string }> => {
    const response = await client.post(
      `/documents/${documentId}/submit-review`,
      data
    )
    return response.data
  },

  assignReviewer: async (
    documentId: string,
    data: AssignReviewerRequest
  ): Promise<{ message: string }> => {
    const response = await client.post(
      `/documents/${documentId}/assign-reviewer`,
      data
    )
    return response.data
  },

  submitReview: async (
    documentId: string,
    data: SubmitReviewRequest
  ): Promise<DocumentReview> => {
    const response = await client.post<DocumentReview>(
      `/documents/${documentId}/review`,
      data
    )
    return response.data
  },

  listReviews: async (documentId: string): Promise<DocumentReviewSummary[]> => {
    const response = await client.get<DocumentReviewSummary[]>(
      `/documents/${documentId}/reviews`
    )
    return response.data
  },

  getReview: async (
    documentId: string,
    reviewId: string
  ): Promise<DocumentReview> => {
    const response = await client.get<DocumentReview>(
      `/documents/${documentId}/reviews/${reviewId}`
    )
    return response.data
  },

  resolveComment: async (
    documentId: string,
    reviewId: string,
    commentId: string
  ): Promise<{ message: string }> => {
    const response = await client.post(
      `/documents/${documentId}/reviews/${reviewId}/comments/${commentId}/resolve`
    )
    return response.data
  },
}
