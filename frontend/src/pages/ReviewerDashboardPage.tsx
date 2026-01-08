import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ClipboardCheck,
  FileText,
  Clock,
  User,
  FolderOpen,
  Loader2,
  Inbox,
  ArrowRight,
  UserCheck,
  CheckCircle,
  Unlock,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { useMyPendingReviews, useMyApprovedDocuments, useRecallToDraft } from '@/hooks/useDocumentReviews'
import { useOrganization } from '@/context/OrganizationContext'
import toast from 'react-hot-toast'

export default function ReviewerDashboardPage() {
  const { canReview } = useOrganization()
  const { data: pendingReviews, isLoading } = useMyPendingReviews()
  const { data: approvedDocs, isLoading: isLoadingApproved } = useMyApprovedDocuments()
  const recallToDraft = useRecallToDraft()

  // Filter to show assigned first, then unassigned
  const sortedReviews = pendingReviews?.sort((a, b) => {
    if (a.assigned_to_me && !b.assigned_to_me) return -1
    if (!a.assigned_to_me && b.assigned_to_me) return 1
    return 0
  })

  const assignedCount = pendingReviews?.filter((r) => r.assigned_to_me).length || 0
  const unassignedCount = pendingReviews?.filter((r) => !r.assigned_to_me).length || 0
  const approvedCount = approvedDocs?.length || 0

  const handleRecallToDraft = (documentId: string, documentTitle: string) => {
    recallToDraft.mutate(documentId, {
      onSuccess: () => {
        toast.success(`"${documentTitle}" recalled to draft`)
      },
      onError: (error) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Failed to recall document'
        toast.error(message)
      },
    })
  }

  if (!canReview) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12">
          <Card variant="elevated" className="text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
              <ClipboardCheck className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500 mb-6">
              You need reviewer permissions to access this page.
            </p>
            <Link to="/projects">
              <Button variant="primary">Go to Projects</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Review Dashboard</h1>
              <p className="text-sm text-slate-500">Documents awaiting your review</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <UserCheck className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{assignedCount}</p>
                <p className="text-sm text-slate-500">Assigned to you</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Inbox className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{unassignedCount}</p>
                <p className="text-sm text-slate-500">Unassigned</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
                <p className="text-sm text-slate-500">Approved</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Reviews List */}
        <Card>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Pending Reviews</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : sortedReviews && sortedReviews.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {sortedReviews.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}/submit-review`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      {doc.assigned_to_me && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                          <UserCheck className="h-3 w-3" />
                          Assigned to you
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      {doc.project?.name && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {doc.project.name}
                        </span>
                      )}
                      {doc.submitter && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.submitter.name || doc.submitter.email}
                        </span>
                      )}
                      {doc.submitted_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(doc.submitted_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mx-auto mb-4">
                <Inbox className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-900 mb-1">No pending reviews</h3>
              <p className="text-sm text-slate-500">
                Documents submitted for review will appear here
              </p>
            </div>
          )}
        </Card>

        {/* Approved Documents */}
        <Card className="mt-6">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Approved Documents</h2>
            <p className="text-xs text-slate-500 mt-0.5">Documents you can recall to draft for further editing</p>
          </div>

          {isLoadingApproved ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : approvedDocs && approvedDocs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {approvedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/documents/${doc.id}/edit`}
                        className="font-medium text-slate-900 truncate hover:text-primary-600"
                      >
                        {doc.title}
                      </Link>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-xs font-medium text-green-700">
                        v{doc.current_version}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      {doc.project?.name && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {doc.project.name}
                        </span>
                      )}
                      {doc.owner && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.owner.name || doc.owner.email}
                        </span>
                      )}
                      {doc.approved_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Approved {format(new Date(doc.approved_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRecallToDraft(doc.id, doc.title)}
                    isLoading={recallToDraft.isPending}
                    leftIcon={<Unlock className="h-3.5 w-3.5" />}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    Recall to Draft
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-900 mb-1">No approved documents</h3>
              <p className="text-sm text-slate-500">
                Approved documents will appear here
              </p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
