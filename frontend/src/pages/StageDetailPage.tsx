import { useEffect } from 'react'
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
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { PageLoading } from '@/components/common/Loading'
import { useSDLCProject, useSDLCStage, useStageDocuments } from '@/hooks/useSDLCProjects'
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
const stageColors: Record<string, { bg: string; text: string; gradient: string }> = {
  Requirements: { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  Design: { bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
  Development: { bg: 'bg-green-50', text: 'text-green-600', gradient: 'from-green-500 to-green-600' },
  Testing: { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' },
  Deployment: { bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500 to-rose-600' },
  Maintenance: { bg: 'bg-slate-50', text: 'text-slate-600', gradient: 'from-slate-500 to-slate-600' },
}

export default function StageDetailPage() {
  const { projectId, stageId } = useParams<{ projectId: string; stageId: string }>()
  const { setBreadcrumbItems, setCurrentProject, setCurrentStage } = useProjectContext()

  const { data: project, isLoading: projectLoading } = useSDLCProject(projectId || '')
  const { data: stage, isLoading: stageLoading } = useSDLCStage(stageId || '')
  const { data: documents = [], isLoading: docsLoading } = useStageDocuments(projectId || '', stageId || '')

  const isLoading = projectLoading || stageLoading || docsLoading

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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl',
                colors.bg,
                colors.text
              )}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{stage.name}</h1>
                {stage.description && (
                  <p className="mt-1 text-slate-500">{stage.description}</p>
                )}
              </div>
            </div>
            <Link
              to={`/projects/${projectId}/stages/${stageId}/documents/new`}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5',
                'bg-gradient-to-r text-white font-medium rounded-xl',
                'shadow-lg hover:shadow-xl transition-shadow',
                colors.gradient
              )}
            >
              <Plus className="h-5 w-5" />
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
              <DocumentCard key={doc.id} document={doc} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  )
}

interface DocumentCardProps {
  document: Document
  index: number
}

function DocumentCard({ document, index }: DocumentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/documents/${document.id}/edit`}>
        <div className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                  {document.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(document.status)
                  )}>
                    {getStatusLabel(document.status)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeTime(document.updated_at)}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
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
  colors: { bg: string; text: string; gradient: string }
}

function EmptyState({ stage, projectId, stageId, colors }: EmptyStateProps) {
  const Icon = stageIcons[stage.name] || FileText

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="flex justify-center mb-6">
        <div className={cn(
          'flex h-20 w-20 items-center justify-center rounded-2xl',
          colors.bg,
          colors.text
        )}>
          <Icon className="h-10 w-10" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        No {stage.name} documents yet
      </h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        Create your first document for the {stage.name.toLowerCase()} phase of your project.
      </p>
      <Link
        to={`/projects/${projectId}/stages/${stageId}/documents/new`}
        className={cn(
          'inline-flex items-center gap-2 px-5 py-2.5',
          'bg-gradient-to-r text-white font-medium rounded-xl',
          'shadow-lg hover:shadow-xl transition-shadow',
          colors.gradient
        )}
      >
        <Plus className="h-5 w-5" />
        Create Document
      </Link>
    </motion.div>
  )
}
