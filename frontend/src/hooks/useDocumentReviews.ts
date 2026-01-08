import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import type {
  SubmitForReviewRequest,
  AssignReviewerRequest,
  SubmitReviewRequest,
  PendingReviewDocument,
} from '@/types'

export const reviewQueryKeys = {
  status: (documentId: string) => ['documents', documentId, 'review-status'] as const,
  reviews: (documentId: string) => ['documents', documentId, 'reviews'] as const,
  review: (documentId: string, reviewId: string) =>
    ['documents', documentId, 'reviews', reviewId] as const,
}

export function useReviewStatus(documentId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.status(documentId),
    queryFn: () => documentsApi.getReviewStatus(documentId),
    enabled: !!documentId,
  })
}

export function useSubmitForReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: SubmitForReviewRequest
    }) => documentsApi.submitForReview(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.status(documentId) })
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
  })
}

export function useAssignReviewer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: AssignReviewerRequest
    }) => documentsApi.assignReviewer(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.status(documentId) })
    },
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: SubmitReviewRequest
    }) => documentsApi.submitReview(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.status(documentId) })
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.reviews(documentId) })
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    },
  })
}

export function useDocumentReviews(documentId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.reviews(documentId),
    queryFn: () => documentsApi.listReviews(documentId),
    enabled: !!documentId,
  })
}

export function useDocumentReview(documentId: string, reviewId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.review(documentId, reviewId),
    queryFn: () => documentsApi.getReview(documentId, reviewId),
    enabled: !!documentId && !!reviewId,
  })
}

export function useResolveComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      reviewId,
      commentId,
    }: {
      documentId: string
      reviewId: string
      commentId: string
    }) => documentsApi.resolveComment(documentId, reviewId, commentId),
    onSuccess: (_, { documentId, reviewId }) => {
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.review(documentId, reviewId),
      })
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.status(documentId) })
    },
  })
}

// ============ Reviewer Dashboard Hooks ============

export function useMyPendingReviews() {
  return useQuery({
    queryKey: ['pending-reviews', 'me'],
    queryFn: () => documentsApi.getMyPendingReviews(),
  })
}

export function useMyApprovedDocuments() {
  return useQuery({
    queryKey: ['approved-documents', 'me'],
    queryFn: () => documentsApi.getMyApprovedDocuments(),
  })
}

export function useRecallToDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => documentsApi.recallToDraft(documentId),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.status(documentId) })
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['approved-documents'] })
    },
  })
}

export function useWithdrawFromReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => documentsApi.withdrawFromReview(documentId),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.status(documentId) })
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] })
    },
  })
}
