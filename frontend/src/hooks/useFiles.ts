import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listFiles,
  getFileTree,
  analyzeFile,
  createFileDocument,
  getFileDocumentInfo,
  analyzeDocumentFile,
  listFileDocuments,
} from '../api/files'
import type {
  CreateFileDocumentRequest,
  AnalyzeFileRequest,
  FileType,
} from '../types'

// ============ Query Keys ============

export const fileKeys = {
  all: ['files'] as const,
  list: (projectId: string, path?: string, fileType?: FileType) =>
    [...fileKeys.all, 'list', projectId, path, fileType] as const,
  tree: (projectId: string) => [...fileKeys.all, 'tree', projectId] as const,
  analysis: (projectId: string, filePath: string) =>
    [...fileKeys.all, 'analysis', projectId, filePath] as const,
  documents: (projectId: string) => [...fileKeys.all, 'documents', projectId] as const,
  documentInfo: (documentId: string) => [...fileKeys.all, 'documentInfo', documentId] as const,
}

// ============ File Browsing Queries ============

export function useFiles(projectId: string, path?: string, fileType?: FileType) {
  return useQuery({
    queryKey: fileKeys.list(projectId, path, fileType),
    queryFn: () => listFiles(projectId, path, fileType),
    enabled: !!projectId,
  })
}

export function useFileTree(projectId: string) {
  return useQuery({
    queryKey: fileKeys.tree(projectId),
    queryFn: () => getFileTree(projectId),
    enabled: !!projectId,
  })
}

// ============ File Analysis ============

export function useAnalyzeFile(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AnalyzeFileRequest) => analyzeFile(projectId, data),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(
        fileKeys.analysis(projectId, variables.file_path),
        result
      )
    },
  })
}

// ============ File Documents ============

export function useFileDocuments(projectId: string) {
  return useQuery({
    queryKey: fileKeys.documents(projectId),
    queryFn: () => listFileDocuments(projectId),
    enabled: !!projectId,
  })
}

export function useFileDocumentInfo(documentId: string) {
  return useQuery({
    queryKey: fileKeys.documentInfo(documentId),
    queryFn: () => getFileDocumentInfo(documentId),
    enabled: !!documentId,
  })
}

export function useCreateFileDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFileDocumentRequest) => createFileDocument(data),
    onSuccess: (_, variables) => {
      if (variables.project_id) {
        queryClient.invalidateQueries({ queryKey: fileKeys.documents(variables.project_id) })
      }
    },
  })
}

export function useAnalyzeDocumentFile(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => analyzeDocumentFile(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.documentInfo(documentId) })
    },
  })
}
