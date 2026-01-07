import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listMappings,
  createMapping,
  getMapping,
  updateMapping,
  deleteMapping,
  bulkCreateMappings,
  reorderMappings,
  deleteAllMappings,
  importMappings,
  getSummary,
  generateDoc,
} from '../api/sttm'
import type {
  CreateSTTMMappingRequest,
  UpdateSTTMMappingRequest,
  STTMBulkCreateRequest,
  STTMReorderRequest,
  STTMImportRequest,
  STTMGenerateDocRequest,
  TransformationType,
} from '../types'

// ============ Query Keys ============

export const sttmKeys = {
  all: ['sttm'] as const,
  list: (documentId: string, filters?: {
    source_system?: string
    target_system?: string
    transformation_type?: TransformationType
  }) => [...sttmKeys.all, 'list', documentId, filters] as const,
  detail: (documentId: string, mappingId: string) =>
    [...sttmKeys.all, 'detail', documentId, mappingId] as const,
  summary: (documentId: string) => [...sttmKeys.all, 'summary', documentId] as const,
}

// ============ Queries ============

export function useSTTMMappings(
  documentId: string,
  filters?: {
    source_system?: string
    target_system?: string
    transformation_type?: TransformationType
  }
) {
  return useQuery({
    queryKey: sttmKeys.list(documentId, filters),
    queryFn: () => listMappings(documentId, filters),
    enabled: !!documentId,
  })
}

export function useSTTMMapping(documentId: string, mappingId: string) {
  return useQuery({
    queryKey: sttmKeys.detail(documentId, mappingId),
    queryFn: () => getMapping(documentId, mappingId),
    enabled: !!documentId && !!mappingId,
  })
}

export function useSTTMSummary(documentId: string) {
  return useQuery({
    queryKey: sttmKeys.summary(documentId),
    queryFn: () => getSummary(documentId),
    enabled: !!documentId,
  })
}

// ============ Mutations ============

export function useCreateSTTMMapping(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSTTMMappingRequest) => createMapping(documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.summary(documentId) })
    },
  })
}

export function useUpdateSTTMMapping(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mappingId, data }: { mappingId: string; data: UpdateSTTMMappingRequest }) =>
      updateMapping(documentId, mappingId, data),
    onSuccess: (_, { mappingId }) => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.detail(documentId, mappingId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.summary(documentId) })
    },
  })
}

export function useDeleteSTTMMapping(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mappingId: string) => deleteMapping(documentId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.summary(documentId) })
    },
  })
}

// ============ Bulk Mutations ============

export function useBulkCreateSTTMMappings(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: STTMBulkCreateRequest) => bulkCreateMappings(documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.summary(documentId) })
    },
  })
}

export function useReorderSTTMMappings(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: STTMReorderRequest) => reorderMappings(documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
    },
  })
}

export function useDeleteAllSTTMMappings(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteAllMappings(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.summary(documentId) })
    },
  })
}

// ============ Import Mutation ============

export function useImportSTTMMappings(documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: STTMImportRequest) => importMappings(documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sttmKeys.list(documentId) })
      queryClient.invalidateQueries({ queryKey: sttmKeys.summary(documentId) })
    },
  })
}

// ============ Generate Doc Mutation ============

export function useGenerateSTTMDoc(documentId: string) {
  return useMutation({
    mutationFn: (data: STTMGenerateDocRequest) => generateDoc(documentId, data),
  })
}
