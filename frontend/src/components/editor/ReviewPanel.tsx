import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
} from 'lucide-react'
import Button from '@/components/common/Button'
import {
  useReviewStatus,
  useSubmitForReview,
  useDocumentReviews,
} from '@/hooks/useDocumentReviews'
import { useProjectMembers } from '@/hooks/useSDLCProjects'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'
import type { ReviewStatus, ReviewDecision } from '@/types'

interface ReviewPanelProps {
  documentId: string
  projectId: string
}

const statusConfig: Record<ReviewStatus, { icon: React.ReactNode; color: string; label: string }> = {
  draft: {
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-slate-100 text-slate-600',
    label: 'Draft',
  },
  pending_review: {
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-700',
    label: 'Pending Review',
  },
  changes_requested: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-700',
    label: 'Changes Requested',
  },
  approved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700',
    label: 'Approved',
  },
}

const decisionConfig: Record<ReviewDecision, { icon: React.ReactNode; color: string }> = {
  approved: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'text-green-600',
  },
  changes_requested: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-orange-600',
  },
  rejected: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-red-600',
  },
}

export default function ReviewPanel({ documentId, projectId }: ReviewPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedReviewer, setSelectedReviewer] = useState<string>('')

  const { data: status, isLoading: statusLoading } = useReviewStatus(documentId)
  const { data: reviews = [], isLoading: reviewsLoading } = useDocumentReviews(documentId)
  const { data: members = [] } = useProjectMembers(projectId)
  const submitForReview = useSubmitForReview()

  const handleSubmitForReview = () => {
    submitForReview.mutate(
      {
        documentId,
        data: { reviewer_id: selectedReviewer || undefined },
      },
      {
        onSuccess: () => {
          toast.success('Document submitted for review')
          setShowSubmitModal(false)
          setSelectedReviewer('')
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to submit for review')
        },
      }
    )
  }

  if (statusLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  const currentStatus = status?.review_status || 'draft'
  const config = statusConfig[currentStatus]
  const canSubmit = currentStatus === 'draft' || currentStatus === 'changes_requested'

  return (
    <div className="border-t border-slate-200">
      {/* Status Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              config.color
            )}>
              {config.icon}
              {config.label}
            </span>
          </div>

          {canSubmit && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowSubmitModal(true)}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Submit for Review
            </Button>
          )}
        </div>

        {/* Reviewer info */}
        {status?.assigned_reviewer && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <User className="h-4 w-4 text-slate-400" />
            <span>Reviewer:</span>
            <span className="font-medium">
              {status.assigned_reviewer.name || status.assigned_reviewer.email}
            </span>
          </div>
        )}

        {/* Pending comments */}
        {status && status.pending_comments > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
            <MessageSquare className="h-4 w-4" />
            <span>{status.pending_comments} unresolved comment(s)</span>
          </div>
        )}

        {/* Approved date */}
        {status?.approved_at && (
          <p className="mt-2 text-xs text-slate-500">
            Approved {formatDistanceToNow(new Date(status.approved_at), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Review History Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Review History ({reviews.length})
        </span>
        {showHistory ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Review History List */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {reviewsLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No reviews yet
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {reviews.map((review) => {
                  const decision = decisionConfig[review.status]
                  return (
                    <div
                      key={review.id}
                      className="px-4 py-3 border-t border-slate-100 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className={decision.color}>{decision.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 capitalize">
                            {review.status.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-slate-500">
                            by {review.reviewer?.name || review.reviewer?.email || 'Unknown'}
                          </p>
                          {review.overall_comment && (
                            <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                              {review.overall_comment}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <span>
                              {formatDistanceToNow(new Date(review.reviewed_at), { addSuffix: true })}
                            </span>
                            {review.comment_count > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {review.comment_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit for Review Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSubmitModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Submit for Review
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Assign Reviewer (optional)
                  </label>
                  <select
                    value={selectedReviewer}
                    onChange={(e) => setSelectedReviewer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a reviewer...</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.user?.id}>
                        {member.user?.name || member.user?.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSubmitModal(false)}
                    disabled={submitForReview.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={submitForReview.isPending}
                    leftIcon={
                      submitForReview.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )
                    }
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
