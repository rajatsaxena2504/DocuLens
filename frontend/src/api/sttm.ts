import api from './client'
import type {
  STTMMapping,
  CreateSTTMMappingRequest,
  UpdateSTTMMappingRequest,
  STTMBulkCreateRequest,
  STTMReorderRequest,
  STTMSummary,
  STTMImportRequest,
  STTMGenerateDocRequest,
  STTMGenerateDocResponse,
  TransformationType,
} from '../types'

// ============ STTM CRUD ============

export async function listMappings(
  documentId: string,
  filters?: {
    source_system?: string
    target_system?: string
    transformation_type?: TransformationType
  }
): Promise<STTMMapping[]> {
  const params = new URLSearchParams()
  if (filters?.source_system) params.append('source_system', filters.source_system)
  if (filters?.target_system) params.append('target_system', filters.target_system)
  if (filters?.transformation_type) params.append('transformation_type', filters.transformation_type)
  const queryString = params.toString()
  const url = `/documents/${documentId}/sttm${queryString ? `?${queryString}` : ''}`
  const response = await api.get<STTMMapping[]>(url)
  return response.data
}

export async function createMapping(
  documentId: string,
  data: CreateSTTMMappingRequest
): Promise<STTMMapping> {
  const response = await api.post<STTMMapping>(`/documents/${documentId}/sttm`, data)
  return response.data
}

export async function getMapping(documentId: string, mappingId: string): Promise<STTMMapping> {
  const response = await api.get<STTMMapping>(`/documents/${documentId}/sttm/${mappingId}`)
  return response.data
}

export async function updateMapping(
  documentId: string,
  mappingId: string,
  data: UpdateSTTMMappingRequest
): Promise<STTMMapping> {
  const response = await api.put<STTMMapping>(`/documents/${documentId}/sttm/${mappingId}`, data)
  return response.data
}

export async function deleteMapping(documentId: string, mappingId: string): Promise<void> {
  await api.delete(`/documents/${documentId}/sttm/${mappingId}`)
}

// ============ Bulk Operations ============

export async function bulkCreateMappings(
  documentId: string,
  data: STTMBulkCreateRequest
): Promise<STTMMapping[]> {
  const response = await api.post<STTMMapping[]>(`/documents/${documentId}/sttm/bulk`, data)
  return response.data
}

export async function reorderMappings(
  documentId: string,
  data: STTMReorderRequest
): Promise<STTMMapping[]> {
  const response = await api.patch<STTMMapping[]>(`/documents/${documentId}/sttm/reorder`, data)
  return response.data
}

export async function deleteAllMappings(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}/sttm`)
}

// ============ Import/Export ============

export async function importMappings(
  documentId: string,
  data: STTMImportRequest
): Promise<STTMMapping[]> {
  const response = await api.post<STTMMapping[]>(`/documents/${documentId}/sttm/import`, data)
  return response.data
}

export function getExportUrl(documentId: string, format: string = 'csv'): string {
  return `${api.defaults.baseURL}/documents/${documentId}/sttm/export?format=${format}`
}

// ============ Summary & Stats ============

export async function getSummary(documentId: string): Promise<STTMSummary> {
  const response = await api.get<STTMSummary>(`/documents/${documentId}/sttm/summary`)
  return response.data
}

// ============ Generate Documentation ============

export async function generateDoc(
  documentId: string,
  data: STTMGenerateDocRequest = {}
): Promise<STTMGenerateDocResponse> {
  const response = await api.post<STTMGenerateDocResponse>(
    `/documents/${documentId}/sttm/generate-doc`,
    data
  )
  return response.data
}
