import api from './client'
import type {
  FileInfo,
  FileTreeNode,
  FileAnalysisResponse,
  FileDocumentResponse,
  CreateFileDocumentRequest,
  AnalyzeFileRequest,
  FileType,
} from '../types'

// ============ File Browsing ============

export async function listFiles(
  projectId: string,
  path?: string,
  fileType?: FileType
): Promise<FileInfo[]> {
  const params = new URLSearchParams()
  if (path) params.append('path', path)
  if (fileType) params.append('file_type', fileType)
  const queryString = params.toString()
  const url = `/projects/${projectId}/files${queryString ? `?${queryString}` : ''}`
  const response = await api.get<FileInfo[]>(url)
  return response.data
}

export async function getFileTree(projectId: string): Promise<FileTreeNode> {
  const response = await api.get<FileTreeNode>(`/projects/${projectId}/files/tree`)
  return response.data
}

// ============ File Analysis ============

export async function analyzeFile(
  projectId: string,
  data: AnalyzeFileRequest
): Promise<FileAnalysisResponse> {
  const response = await api.post<FileAnalysisResponse>(
    `/projects/${projectId}/files/analyze`,
    data
  )
  return response.data
}

// ============ File-Level Documents ============

export async function createFileDocument(
  data: CreateFileDocumentRequest
): Promise<FileDocumentResponse> {
  const response = await api.post<FileDocumentResponse>('/documents/file-level', data)
  return response.data
}

export async function getFileDocumentInfo(documentId: string): Promise<FileDocumentResponse> {
  const response = await api.get<FileDocumentResponse>(`/documents/${documentId}/file-info`)
  return response.data
}

export async function analyzeDocumentFile(documentId: string): Promise<FileAnalysisResponse> {
  const response = await api.post<FileAnalysisResponse>(`/documents/${documentId}/analyze-file`)
  return response.data
}

export async function listFileDocuments(projectId: string): Promise<FileDocumentResponse[]> {
  const response = await api.get<FileDocumentResponse[]>(`/projects/${projectId}/file-documents`)
  return response.data
}
