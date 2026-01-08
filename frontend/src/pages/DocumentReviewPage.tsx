import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
  Clock,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { PageLoading } from '@/components/common/Loading'
import { useDocument } from '@/hooks/useDocuments'
import { useReviewStatus, useSubmitReview } from '@/hooks/useDocumentReviews'
import { useSDLCProject } from '@/hooks/useSDLCProjects'
import { useOrganization } from '@/context/OrganizationContext'
import toast from 'react-hot-toast'
import type { ReviewCommentCreate } from '@/types'

export default function DocumentReviewPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { canReview } = useOrganization()

  const { data: document, isLoading } = useDocument(documentId || '')
  const { data: reviewStatus } = useReviewStatus(documentId || '')
  const { data: project } = useSDLCProject(document?.sdlc_project_id || '')
  const submitReview = useSubmitReview()

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [overallComment, setOverallComment] = useState('')
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  // Expand all sections by default
  useEffect(() => {
    if (document?.sections) {
      setExpandedSections(new Set(document.sections.map((s) => s.id)))
    }
  }, [document])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleApprove = () => {
    if (!documentId) return

    // Collect section comments
    const comments: ReviewCommentCreate[] = Object.entries(sectionComments)
      .filter(([, comment]) => comment.trim())
      .map(([sectionId, comment]) => ({
        document_section_id: sectionId,
        comment,
      }))

    submitReview.mutate(
      {
        documentId,
        data: {
          status: 'approved',
          overall_comment: overallComment || undefined,
          comments: comments.length > 0 ? comments : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Document approved! A new version has been created.')
          navigate('/reviews')
        },
        onError: (error) => {
          const message =
            (error as { response?: { data?: { detail?: string } } })?.response?.data
              ?.detail || 'Failed to submit review'
          toast.error(message)
        },
      }
    )
  }

  const handleRequestChanges = () => {
    if (!documentId) return

    if (!overallComment.trim()) {
      toast.error('Please provide feedback when requesting changes')
      return
    }

    // Collect section comments
    const comments: ReviewCommentCreate[] = Object.entries(sectionComments)
      .filter(([, comment]) => comment.trim())
      .map(([sectionId, comment]) => ({
        document_section_id: sectionId,
        comment,
      }))

    submitReview.mutate(
      {
        documentId,
        data: {
          status: 'changes_requested',
          overall_comment: overallComment,
          comments: comments.length > 0 ? comments : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Changes requested. The editor will be notified.')
          navigate('/reviews')
        },
        onError: (error) => {
          const message =
            (error as { response?: { data?: { detail?: string } } })?.response?.data
              ?.detail || 'Failed to submit review'
          toast.error(message)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  if (!document) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12">
          <Card variant="elevated" className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Document not found</h2>
            <p className="text-slate-500 mb-6">The document you're looking for doesn't exist.</p>
            <Link to="/reviews">
              <Button variant="primary">Back to Reviews</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    )
  }

  if (!canReview) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12">
          <Card variant="elevated" className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500 mb-6">You don't have permission to review documents.</p>
            <Link to="/projects">
              <Button variant="primary">Go to Projects</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    )
  }

  if (reviewStatus?.review_status !== 'pending_review') {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12">
          <Card variant="elevated" className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Not Available for Review</h2>
            <p className="text-slate-500 mb-6">
              This document is not currently pending review.
              {reviewStatus?.review_status === 'approved' && ' It has already been approved.'}
              {reviewStatus?.review_status === 'draft' && ' It is still in draft status.'}
            </p>
            <Link to="/reviews">
              <Button variant="primary">Back to Reviews</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    )
  }

  const includedSections = document.sections.filter((s) => s.is_included)

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reviews
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{document.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                {project && (
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-4 w-4" />
                    {project.name}
                  </span>
                )}
                {reviewStatus?.submitted_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Submitted {format(new Date(reviewStatus.submitted_at), 'MMM d, h:mm a')}
                  </span>
                )}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-sm font-medium text-amber-700">
              Pending Review
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Document Content */}
          <div className="col-span-2 space-y-4">
            {includedSections.map((section, index) => (
              <Card key={section.id}>
                <div
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100"
                >
                  <motion.div
                    animate={{ rotate: expandedSections.has(section.id) ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </motion.div>
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200 text-xs font-medium text-slate-600">
                    {index + 1}
                  </span>
                  <h3 className="font-medium text-slate-900">{section.title}</h3>
                </div>

                <AnimatePresence>
                  {expandedSections.has(section.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4">
                        {section.content ? (
                          <RichTextEditor content={section.content} editable={false} />
                        ) : (
                          <p className="text-sm text-slate-500 italic">No content</p>
                        )}
                      </div>

                      {/* Section comment */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            Comment on this section
                          </span>
                        </div>
                        <textarea
                          value={sectionComments[section.id] || ''}
                          onChange={(e) =>
                            setSectionComments((prev) => ({
                              ...prev,
                              [section.id]: e.target.value,
                            }))
                          }
                          placeholder="Add feedback for this section (optional)..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>

          {/* Review Panel */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Submit Review</h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Overall comment */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Overall Feedback
                  </label>
                  <textarea
                    value={overallComment}
                    onChange={(e) => setOverallComment(e.target.value)}
                    placeholder="Add overall feedback or notes..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    isLoading={submitReview.isPending}
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                  >
                    Approve Document
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={submitReview.isPending}
                    leftIcon={<XCircle className="h-4 w-4" />}
                  >
                    Request Changes
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Approving will create a new version of this document.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Request Changes Confirmation */}
      <AnimatePresence>
        {showRejectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowRejectConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Request Changes</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    The document will be sent back to the editor with your feedback.
                  </p>
                </div>
              </div>

              {!overallComment.trim() && (
                <div className="p-3 bg-amber-50 rounded-lg mb-4">
                  <p className="text-sm text-amber-700">
                    Please provide feedback in the "Overall Feedback" field before requesting
                    changes.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowRejectConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    setShowRejectConfirm(false)
                    handleRequestChanges()
                  }}
                  disabled={!overallComment.trim()}
                >
                  Request Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
