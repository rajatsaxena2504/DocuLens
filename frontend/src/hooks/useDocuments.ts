import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import { generationApi } from '@/api/sections'
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  ReorderSectionsRequest,
} from '@/types'
import toast from 'react-hot-toast'

export function useDocuments(projectId?: string) {
  return useQuery({
    queryKey: ['documents', { projectId }],
    queryFn: () => documentsApi.list(projectId),
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => documentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document created')
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      const message = error.response?.data?.detail || 'Failed to create document'
      toast.error(message)
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentRequest }) =>
      documentsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: () => {
      toast.error('Failed to update document')
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: () => {
      toast.error('Failed to delete document')
    },
  })
}

export function useSectionSuggestions(documentId: string, enabled = true) {
  return useQuery({
    queryKey: ['documents', documentId, 'suggestions'],
    queryFn: () => documentsApi.getSuggestions(documentId),
    enabled: !!documentId && enabled,
  })
}

export function useAddSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: CreateSectionRequest }) =>
      documentsApi.addSection(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
    onError: () => {
      toast.error('Failed to add section')
    },
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      sectionId,
      data,
    }: {
      documentId: string
      sectionId: string
      data: UpdateSectionRequest
    }) => documentsApi.updateSection(documentId, sectionId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
    onError: () => {
      toast.error('Failed to update section')
    },
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, sectionId }: { documentId: string; sectionId: string }) =>
      documentsApi.deleteSection(documentId, sectionId),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      toast.success('Section removed')
    },
    onError: () => {
      toast.error('Failed to remove section')
    },
  })
}

export function useReorderSections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: ReorderSectionsRequest }) =>
      documentsApi.reorderSections(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
    onError: () => {
      toast.error('Failed to reorder sections')
    },
  })
}

export function useGenerateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => generationApi.generateDocument(documentId),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      toast.success('Document generated successfully')
    },
    onError: () => {
      toast.error('Failed to generate document')
    },
  })
}

export function useRegenerateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      sectionId,
      customPrompt,
    }: {
      documentId: string
      sectionId: string
      customPrompt?: string
    }) => generationApi.regenerateSection(documentId, sectionId, { customPrompt }),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
    onError: () => {
      toast.error('Failed to regenerate section')
    },
  })
}

export function useUpdateSectionContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      sectionId,
      content,
    }: {
      documentId: string
      sectionId: string
      content: string
    }) => documentsApi.updateSectionContent(documentId, sectionId, content),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
    onError: () => {
      toast.error('Failed to save content')
    },
  })
}
