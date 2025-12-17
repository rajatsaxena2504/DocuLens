import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus,
  FileText,
  Clock,
  ChevronRight,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  Trash2,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { PageLoading } from '@/components/common/Loading'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { useSDLCProject, useSDLCStage, useStageDocuments } from '@/hooks/useSDLCProjects'
import { useDeleteDocument } from '@/hooks/useDocuments'
import { useProjectContext } from '@/context/ProjectContext'
import { formatRelativeTime, getStatusColor, getStatusLabel, cn } from '@/utils/helpers'
import type { Document, SDLCStage } from '@/types'

// Map stage names to icons
const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Requirements: ClipboardList,
  Design: Pencil,
  Development: Code2,
  Testing: TestTube2,
  Deployment: Rocket,
  Maintenance: Wrench,
}

// Map stage names to colors
const stageColors: Record<string, { bg: string; text: string }> = {
  Requirements: { bg: 'bg-blue-50', text: 'text-blue-600' },
  Design: { bg: 'bg-purple-50', text: 'text-purple-600' },
  Development: { bg: 'bg-green-50', text: 'text-green-600' },
  Testing: { bg: 'bg-amber-50', text: 'text-amber-600' },
  Deployment: { bg: 'bg-rose-50', text: 'text-rose-600' },
  Maintenance: { bg: 'bg-slate-50', text: 'text-slate-600' },
}

export default function StageDetailPage() {
  const { projectId, stageId } = useParams<{ projectId: string; stageId: string }>()
  const { setBreadcrumbItems, setCurrentProject, setCurrentStage } = useProjectContext()

  const { data: project, isLoading: projectLoading } = useSDLCProject(projectId || '')
  const { data: stage, isLoading: stageLoading } = useSDLCStage(stageId || '')
  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocuments } = useStageDocuments(projectId || '', stageId || '')
  const deleteDocument = useDeleteDocument()

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)

  const isLoading = projectLoading || stageLoading || docsLoading

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!documentToDelete) return

    deleteDocument.mutate(documentToDelete.id, {
      onSuccess: () => {
        setDeleteModalOpen(false)
        setDocumentToDelete(null)
        refetchDocuments()
      },
    })
  }

  // Set breadcrumb and context
  useEffect(() => {
    if (project && stage) {
      setCurrentProject(project)
      setCurrentStage(stage)
      setBreadcrumbItems([
        { label: 'Projects', href: '/projects' },
        { label: project.name, href: `/projects/${project.id}` },
        { label: stage.name },
      ])
    }
    return () => {
      setBreadcrumbItems([])
      setCurrentStage(null)
    }
  }, [project, stage, setBreadcrumbItems, setCurrentProject, setCurrentStage])

  if (isLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  if (!project || !stage) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Stage not found</p>
          <Link to={`/projects/${projectId}`} className="mt-4 text-primary-600 hover:underline">
            Back to Project
          </Link>
        </div>
      </Layout>
    )
  }

  const Icon = stageIcons[stage.name] || FileText
  const colors = stageColors[stage.name] || stageColors.Maintenance

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                colors.bg,
                colors.text
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{stage.name}</h1>
                {stage.description && (
                  <p className="text-sm text-slate-500">{stage.description}</p>
                )}
              </div>
            </div>
            <Link
              to={`/projects/${projectId}/stages/${stageId}/documents/new`}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Document
            </Link>
          </div>
        </motion.div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <EmptyState stage={stage} projectId={projectId!} stageId={stageId!} colors={colors} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {documents.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                index={index}
                onDelete={handleDeleteClick}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setDocumentToDelete(null)
        }}
        title="Delete Document"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-medium text-slate-900">"{documentToDelete?.title}"</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setDocumentToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleteDocument.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}

interface DocumentCardProps {
  document: Document
  index: number
  onDelete: (doc: Document) => void
}

function DocumentCard({ document, index, onDelete }: DocumentCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(document)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/documents/${document.id}/edit`}>
        <div className="group bg-white rounded-lg border border-slate-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                  {document.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(document.status)
                  )}>
                    {getStatusLabel(document.status)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(document.updated_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

interface EmptyStateProps {
  stage: SDLCStage
  projectId: string
  stageId: string
  colors: { bg: string; text: string }
}

function EmptyState({ stage, projectId, stageId, colors }: EmptyStateProps) {
  const Icon = stageIcons[stage.name] || FileText

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="flex justify-center mb-4">
        <div className={cn(
          'flex h-14 w-14 items-center justify-center rounded-lg',
          colors.bg,
          colors.text
        )}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        No {stage.name} documents yet
      </h3>
      <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
        Create your first document for the {stage.name.toLowerCase()} phase.
      </p>
      <Link
        to={`/projects/${projectId}/stages/${stageId}/documents/new`}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create Document
      </Link>
    </motion.div>
  )
}
