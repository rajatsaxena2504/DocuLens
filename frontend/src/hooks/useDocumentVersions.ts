import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import type {
  CreateVersionRequest,
  CompareVersionsRequest,
  RestoreVersionRequest,
} from '@/types'

export const versionQueryKeys = {
  versions: (documentId: string) => ['document-versions', documentId] as const,
  version: (documentId: string, versionNumber: number) =>
    ['document-versions', documentId, versionNumber] as const,
  comparison: (documentId: string, from: number, to: number) =>
    ['document-versions', documentId, 'compare', from, to] as const,
}

export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: versionQueryKeys.versions(documentId),
    queryFn: () => documentsApi.listVersions(documentId),
    enabled: !!documentId,
  })
}

export function useDocumentVersion(documentId: string, versionNumber: number) {
  return useQuery({
    queryKey: versionQueryKeys.version(documentId, versionNumber),
    queryFn: () => documentsApi.getVersion(documentId, versionNumber),
    enabled: !!documentId && versionNumber > 0,
  })
}

export function useCreateVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: CreateVersionRequest
    }) => documentsApi.createVersion(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({
        queryKey: versionQueryKeys.versions(documentId),
      })
      // Also invalidate the document query to update current_version
      queryClient.invalidateQueries({
        queryKey: ['documents', documentId],
      })
    },
  })
}

export function useCompareVersions(
  documentId: string,
  fromVersion: number,
  toVersion: number
) {
  return useQuery({
    queryKey: versionQueryKeys.comparison(documentId, fromVersion, toVersion),
    queryFn: () =>
      documentsApi.compareVersions(documentId, {
        from_version: fromVersion,
        to_version: toVersion,
      }),
    enabled: !!documentId && fromVersion > 0 && toVersion > 0,
  })
}

export function useCompareVersionsMutation() {
  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: CompareVersionsRequest
    }) => documentsApi.compareVersions(documentId, data),
  })
}

export function useRestoreVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: RestoreVersionRequest
    }) => documentsApi.restoreVersion(documentId, data),
    onSuccess: (_, { documentId }) => {
      // Invalidate versions list
      queryClient.invalidateQueries({
        queryKey: versionQueryKeys.versions(documentId),
      })
      // Invalidate document data
      queryClient.invalidateQueries({
        queryKey: ['documents', documentId],
      })
    },
  })
}
