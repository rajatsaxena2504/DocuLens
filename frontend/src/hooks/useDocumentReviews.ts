import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/api/documents'
import type {
  SubmitForReviewRequest,
  AssignReviewerRequest,
  SubmitReviewRequest,
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
