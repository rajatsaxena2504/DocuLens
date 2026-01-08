import { useState, useEffect } from 'react'
import { Send, Loader2, User, AlertCircle } from 'lucide-react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { organizationsApi } from '@/api/organizations'
import { useOrganization } from '@/context/OrganizationContext'
import { useSubmitForReview } from '@/hooks/useDocumentReviews'
import type { OrganizationMember } from '@/types'
import toast from 'react-hot-toast'
import { cn } from '@/utils/helpers'

interface SubmitForReviewModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentTitle: string
}

export default function SubmitForReviewModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}: SubmitForReviewModalProps) {
  const { currentOrg } = useOrganization()
  const submitForReview = useSubmitForReview()

  const [reviewers, setReviewers] = useState<OrganizationMember[]>([])
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false)

  useEffect(() => {
    if (isOpen && currentOrg) {
      loadReviewers()
    }
  }, [isOpen, currentOrg])

  const loadReviewers = async () => {
    if (!currentOrg) return

    setIsLoadingReviewers(true)
    try {
      const members = await organizationsApi.listMembers(currentOrg.id)
      // Filter to only show members with reviewer role (NOT owners)
      const reviewerMembers = members.filter(
        (m) => m.roles?.includes('reviewer')
      )
      setReviewers(reviewerMembers)
    } catch (error) {
      console.error('Failed to load reviewers:', error)
      toast.error('Failed to load reviewers')
    } finally {
      setIsLoadingReviewers(false)
    }
  }

  const handleSubmit = () => {
    submitForReview.mutate(
      {
        documentId,
        data: {
          reviewer_id: selectedReviewerId || undefined,
          note: note || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Document submitted for review')
          onClose()
          setSelectedReviewerId(null)
          setNote('')
        },
        onError: (error) => {
          const message =
            (error as { response?: { data?: { detail?: string } } })?.response?.data
              ?.detail || 'Failed to submit for review'
          toast.error(message)
        },
      }
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit for Review" size="md">
      <div className="space-y-4">
        {/* Document info */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            You are submitting <span className="font-medium text-slate-900">{documentTitle}</span> for review.
          </p>
        </div>

        {/* Reviewer selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Assign Reviewer (Optional)
          </label>
          {isLoadingReviewers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : reviewers.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-700">
                No reviewers available. Ask an organization owner to assign the reviewer role to team members.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {/* No specific reviewer option */}
              <button
                onClick={() => setSelectedReviewerId(null)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                  selectedReviewerId === null
                    ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Any available reviewer</p>
                  <p className="text-xs text-slate-500">Let any reviewer pick up this document</p>
                </div>
              </button>

              {/* Individual reviewers */}
              {reviewers.map((reviewer) => (
                <button
                  key={reviewer.id}
                  onClick={() => setSelectedReviewerId(reviewer.user_id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                    selectedReviewerId === reviewer.user_id
                      ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                    <span className="text-sm font-medium text-primary-700">
                      {(reviewer.user?.name || reviewer.user_email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {reviewer.user?.name || reviewer.user_email || 'Unknown User'}
                    </p>
                    {reviewer.user?.name && reviewer.user_email && (
                      <p className="text-xs text-slate-500 truncate">{reviewer.user_email}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {reviewer.roles?.map((role) => (
                      <span
                        key={role}
                        className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          role === 'owner' && 'bg-purple-100 text-purple-700',
                          role === 'reviewer' && 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Note for Reviewer (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any context or specific areas to focus on..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitForReview.isPending}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Submit for Review
          </Button>
        </div>
      </div>
    </Modal>
  )
}
