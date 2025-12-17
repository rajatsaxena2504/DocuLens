import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Plus,
  FolderGit2,
  FileText,
  ChevronRight,
  ExternalLink,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  Download,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { PageLoading } from '@/components/common/Loading'
import Button from '@/components/common/Button'
import { useSDLCProject, useSDLCStages } from '@/hooks/useSDLCProjects'
import { useProjectContext } from '@/context/ProjectContext'
import { generationApi } from '@/api/sections'
import { formatDate } from '@/utils/helpers'
import { cn } from '@/utils/helpers'
import type { SDLCStage, Repository } from '@/types'

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
const stageColors: Record<string, { bg: string; text: string; border: string; light: string }> = {
  Requirements: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50' },
  Design: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-50' },
  Development: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200', light: 'bg-green-50' },
  Testing: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50' },
  Deployment: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50' },
  Maintenance: { bg: 'bg-slate-500', text: 'text-slate-600', border: 'border-slate-200', light: 'bg-slate-50' },
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { setBreadcrumbItems, setCurrentProject } = useProjectContext()

  const { data: project, isLoading: projectLoading } = useSDLCProject(projectId || '')
  const { data: stages = [], isLoading: stagesLoading } = useSDLCStages()

  const isLoading = projectLoading || stagesLoading
  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order)

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      setBreadcrumbItems([
        { label: 'Projects', href: '/projects' },
        { label: project.name },
      ])
    }
    return () => {
      setBreadcrumbItems([])
      setCurrentProject(null)
    }
  }, [project, setBreadcrumbItems, setCurrentProject])

  if (isLoading) {
    return <Layout><PageLoading /></Layout>
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Project not found</p>
          <Link to="/projects" className="mt-4 text-primary-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-slate-500">{project.description}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                Created {formatDate(project.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={generationApi.exportProjectBundle(project.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </a>
              <Link to={`/projects/${project.id}/repositories/add`}>
                <Button size="sm" variant="secondary" leftIcon={<FolderGit2 className="h-3.5 w-3.5" />}>
                  Add Repo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Repositories */}
        {project.repositories && project.repositories.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Repositories</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {project.repositories.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} />
              ))}
            </div>
          </div>
        )}

        {/* SDLC Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">SDLC Stages</h2>
            <p className="text-xs text-slate-500">Select a stage to create documentation</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedStages.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage}
                projectId={project.id}
                documentCount={project.stage_document_counts?.[stage.id] || 0}
              />
            ))}
          </div>
        </div>

        {/* Quick Start if no repos */}
        {(!project.repositories || project.repositories.length === 0) && (
          <div className="mt-6 p-6 bg-primary-50 border border-primary-100 rounded-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm">
                <FolderGit2 className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Get Started</h3>
            <p className="text-sm text-slate-600 mb-4">
              Add a repository to start generating documentation.
            </p>
            <Link to={`/projects/${project.id}/repositories/add`}>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add Repository
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  )
}

interface RepositoryCardProps {
  repo: Repository
}

function RepositoryCard({ repo }: RepositoryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <FolderGit2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-900">{repo.name}</h3>
            {repo.repo_type && (
              <span className="text-xs text-slate-400 capitalize">{repo.repo_type}</span>
            )}
          </div>
        </div>
        {repo.github_url && (
          <a
            href={repo.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {repo.description && (
        <p className="mt-2 text-xs text-slate-500 line-clamp-1">{repo.description}</p>
      )}
    </div>
  )
}

interface StageCardProps {
  stage: SDLCStage
  projectId: string
  documentCount: number
}

function StageCard({ stage, projectId, documentCount }: StageCardProps) {
  const Icon = stageIcons[stage.name] || FileText
  const colors = stageColors[stage.name] || stageColors.Maintenance

  return (
    <Link to={`/projects/${projectId}/stages/${stage.id}`}>
      <div className="group bg-white rounded-lg border border-slate-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            colors.light,
            colors.text
          )}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{stage.name}</h3>
            {stage.description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{stage.description}</p>
            )}
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
              <FileText className="h-3 w-3" />
              <span>{documentCount} docs</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}
