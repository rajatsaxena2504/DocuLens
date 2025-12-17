import client from './client'
import type { Section, DocumentType, DocumentTypeWithSections } from '@/types'

export interface SectionWithTemplates extends Section {
  templates_using: Array<{
    id: string
    name: string
    stage: string | null
  }>
  template_count: number
}

export interface TemplateWithSections {
  id: string
  name: string
  description: string | null
  stage: string | null
  is_system: boolean
  created_at: string | null
  sections: Array<{
    id: string
    name: string
    description: string
    default_order: number
    is_system: boolean
  }>
}

export const sectionsApi = {
  list: async (docTypeId?: string): Promise<Section[]> => {
    const response = await client.get<Section[]>('/sections', {
      params: docTypeId ? { doc_type: docTypeId } : undefined,
    })
    return response.data
  },

  get: async (id: string): Promise<Section> => {
    const response = await client.get<Section>(`/sections/${id}`)
    return response.data
  },

  create: async (data: {
    name: string
    description: string
    default_order?: number
    applicable_doc_types?: string[]
  }): Promise<Section> => {
    const response = await client.post<Section>('/sections', data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/sections/${id}`)
  },

  updateDescription: async (id: string, description: string): Promise<Section> => {
    const response = await client.patch<Section>(`/sections/${id}/description`, { description })
    return response.data
  },

  listWithTemplates: async (): Promise<SectionWithTemplates[]> => {
    const response = await client.get<SectionWithTemplates[]>('/sections/library/with-templates')
    return response.data
  },
}

export const templatesApi = {
  list: async (stageId?: string): Promise<DocumentType[]> => {
    const response = await client.get<DocumentType[]>('/templates', {
      params: stageId ? { stage_id: stageId } : undefined,
    })
    return response.data
  },

  listByStage: async (stageId: string): Promise<DocumentType[]> => {
    const response = await client.get<DocumentType[]>(`/templates/by-stage/${stageId}`)
    return response.data
  },

  listWithSections: async (): Promise<TemplateWithSections[]> => {
    const response = await client.get<TemplateWithSections[]>('/templates/library/with-sections')
    return response.data
  },

  get: async (id: string): Promise<DocumentTypeWithSections> => {
    const response = await client.get<DocumentTypeWithSections>(`/templates/${id}`)
    return response.data
  },

  create: async (data: { name: string; description?: string }): Promise<DocumentType> => {
    const response = await client.post<DocumentType>('/templates', data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/templates/${id}`)
  },
}

export const generationApi = {
  generateDocument: async (
    documentId: string,
    repositoryIds?: string[]
  ): Promise<{
    document_id: string
    status: string
    results: Array<{
      section_id: string
      title: string
      success: boolean
      content_id?: string
      error?: string
      used_placeholder?: boolean
    }>
  }> => {
    const response = await client.post(`/generation/documents/${documentId}/generate`, {
      repository_ids: repositoryIds,
    })
    return response.data
  },

  regenerateSection: async (
    documentId: string,
    sectionId: string,
    options?: { repositoryIds?: string[]; customPrompt?: string }
  ): Promise<{
    section_id: string
    title: string
    content_id: string
    content: string
    used_placeholder?: boolean
  }> => {
    const response = await client.post(
      `/generation/documents/${documentId}/sections/${sectionId}/generate`,
      {
        repository_ids: options?.repositoryIds,
        custom_prompt: options?.customPrompt,
      }
    )
    return response.data
  },

  exportDocument: (documentId: string, format: 'markdown' | 'docx' | 'pdf'): string => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    return `${API_URL}/api/generation/documents/${documentId}/export?format=${format}`
  },

  exportProjectBundle: (projectId: string, stageId?: string): string => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    let url = `${API_URL}/api/generation/projects/${projectId}/export-bundle`
    if (stageId) {
      url += `?stage_id=${stageId}`
    }
    return url
  },
}
