import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Pencil, Code2, TestTube2, Rocket, Wrench } from 'lucide-react'
import Layout from '@/components/common/Layout'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import TemplateSelector from '@/components/documents/TemplateSelector'
import { useCreateDocument } from '@/hooks/useDocuments'
import { useSDLCProject, useSDLCStage } from '@/hooks/useSDLCProjects'
import { PageLoading } from '@/components/common/Loading'
import { useProjectContext } from '@/context/ProjectContext'
import { cn } from '@/utils/helpers'
import type { DocumentType } from '@/types'

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
const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Requirements: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  Design: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  Development: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  Testing: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  Deployment: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  Maintenance: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function NewDocumentPage() {
  const { projectId, stageId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setBreadcrumbItems, setCurrentProject, setCurrentStage } = useProjectContext()

  const actualProjectId = projectId || searchParams.get('project')

  const { data: project, isLoading: projectLoading } = useSDLCProject(actualProjectId || '')
  const { data: stage, isLoading: stageLoading } = useSDLCStage(stageId || '')
  const createDocument = useCreateDocument()

  const [title, setTitle] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentType | null>(null)

  const isLoading = projectLoading || (stageId && stageLoading)

  // Set breadcrumb context
  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      const crumbs: Array<{ label: string; href?: string }> = [
        { label: 'Projects', href: '/projects' },
        { label: project.name, href: `/projects/${project.id}` },
      ]
      if (stage) {
        setCurrentStage(stage)
        crumbs.push({ label: stage.name, href: `/projects/${project.id}/stages/${stage.id}` })
      }
      crumbs.push({ label: 'New Document' })
      setBreadcrumbItems(crumbs)
    }
    return () => {
      setBreadcrumbItems([])
      setCurrentStage(null)
    }
  }, [project, stage, setBreadcrumbItems, setCurrentProject, setCurrentStage])

  if (isLoading) return <Layout><PageLoading /></Layout>

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
        </div>
      </Layout>
    )
  }

  const Icon = stage ? stageIcons[stage.name] || ClipboardList : null
  const colors = stage ? stageColors[stage.name] || stageColors.Maintenance : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !selectedTemplate || !actualProjectId) return

    createDocument.mutate(
      {
        project_id: actualProjectId,
        document_type_id: selectedTemplate.id,
        stage_id: stageId, // Include stage context
        title,
      },
      {
        onSuccess: (doc) => {
          navigate(`/documents/${doc.id}/review`)
        },
      }
    )
  }

  const backLink = stageId
    ? `/projects/${projectId}/stages/${stageId}`
    : `/projects/${projectId}`

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          to={backLink}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {stage ? stage.name : 'Project'}
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Document</h1>
          <p className="text-sm text-gray-500">
            Generate documentation for <span className="font-medium">{project.name}</span>
          </p>
        </div>

        {/* Stage indicator if present */}
        {stage && Icon && colors && (
          <div className={cn(
            'mb-6 rounded-xl border p-4 flex items-center gap-3',
            colors.bg,
            colors.border
          )}>
            <div className={cn('p-2 rounded-lg bg-white/80', colors.text)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">SDLC Stage</p>
              <p className={cn('text-lg font-semibold', colors.text)}>{stage.name}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <Input
              id="title"
              label="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., API Documentation for MyProject"
              required
            />
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              {stage ? `${stage.name} Document Types` : 'Select Document Type'}
            </h2>
            <TemplateSelector
              selectedId={selectedTemplate?.id || null}
              onSelect={setSelectedTemplate}
              stageId={stageId}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={createDocument.isPending}
            disabled={!title || !selectedTemplate}
          >
            Continue to Section Review
          </Button>
        </form>
      </div>
    </Layout>
  )
}
