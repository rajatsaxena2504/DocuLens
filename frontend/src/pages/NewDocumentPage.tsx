import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Pencil, Code2, TestTube2, Rocket, Wrench, Upload } from 'lucide-react'
import Layout from '@/components/common/Layout'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import TemplateSelector from '@/components/documents/TemplateSelector'
import TemplateUpload from '@/components/projects/TemplateUpload'
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
  const [templateFile, setTemplateFile] = useState<File | null>(null)

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
          <p className="text-slate-500">Project not found</p>
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
        stage_id: stageId,
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
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          to={backLink}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {stage ? stage.name : 'Project'}
        </Link>

        {/* Header with stage indicator */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Create New Document</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Generate documentation for <span className="font-medium">{project.name}</span>
            </p>
          </div>
          {stage && Icon && colors && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
              colors.bg,
              colors.border
            )}>
              <Icon className={cn('h-4 w-4', colors.text)} />
              <span className={cn('text-sm font-medium', colors.text)}>{stage.name}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title input */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <Input
              id="title"
              label="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., API Documentation for MyProject"
              required
            />
          </div>

          {/* Template selector */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              {stage ? `${stage.name} Document Types` : 'Select Document Type'}
            </h2>
            <TemplateSelector
              selectedId={selectedTemplate?.id || null}
              onSelect={setSelectedTemplate}
              stageId={stageId}
            />
          </div>

          {/* Optional template upload */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Upload Existing Document
              </h2>
              <span className="text-xs text-slate-400">(Optional)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Have an existing document? Upload it and we'll extract sections to help structure your documentation.
            </p>
            <TemplateUpload
              file={templateFile}
              onFileSelect={setTemplateFile}
              onFileClear={() => setTemplateFile(null)}
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
