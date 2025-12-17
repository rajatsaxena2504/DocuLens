import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  Settings,
  Download,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { PageLoading } from '@/components/common/Loading'
import { useSDLCProject, useSDLCStages } from '@/hooks/useSDLCProjects'
import { useProjectContext } from '@/context/ProjectContext'
import { generationApi } from '@/api/sections'
import { formatDate, formatRelativeTime } from '@/utils/helpers'
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
const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Requirements: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  Design: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  Development: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  Testing: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  Deployment: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  Maintenance: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { setBreadcrumbItems, setCurrentProject } = useProjectContext()

  const { data: project, isLoading: projectLoading } = useSDLCProject(projectId || '')
  const { data: stages = [], isLoading: stagesLoading } = useSDLCStages()

  const isLoading = projectLoading || stagesLoading
  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order)

  // Set breadcrumb and current project context
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
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-slate-500 max-w-2xl">{project.description}</p>
              )}
              <p className="mt-2 text-sm text-slate-400">
                Created {formatDate(project.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={generationApi.exportProjectBundle(project.id)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                title="Export all documentation as a bundle"
              >
                <Download className="h-4 w-4" />
                Export Bundle
              </a>
              <Link
                to={`/projects/${project.id}/repositories/add`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                <FolderGit2 className="h-4 w-4" />
                Add Repository
              </Link>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Repositories Section */}
        {project.repositories && project.repositories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Repositories</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.repositories.map((repo, index) => (
                <RepositoryCard key={repo.id} repo={repo} index={index} />
              ))}
            </div>
          </motion.div>
        )}

        {/* SDLC Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">SDLC Documentation Pipeline</h2>
          <p className="text-slate-500 text-sm mb-6">
            Select a stage to view and create documentation for that phase of the software development lifecycle.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedStages.map((stage, index) => (
              <StageCard
                key={stage.id}
                stage={stage}
                projectId={project.id}
                documentCount={project.stage_document_counts?.[stage.id] || 0}
                index={index}
              />
            ))}
          </div>
        </motion.div>

        {/* Quick Start Section */}
        {(!project.repositories || project.repositories.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-8 bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-100 rounded-2xl text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                <FolderGit2 className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Get Started</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Add your first repository to start generating AI-powered documentation for your codebase.
            </p>
            <Link
              to={`/projects/${project.id}/repositories/add`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl transition-shadow"
            >
              <Plus className="h-5 w-5" />
              Add Repository
            </Link>
          </motion.div>
        )}
      </div>
    </Layout>
  )
}

interface RepositoryCardProps {
  repo: Repository
  index: number
}

function RepositoryCard({ repo, index }: RepositoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="group bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">{repo.name}</h3>
              {repo.repo_type && (
                <span className="text-xs text-slate-500 capitalize">{repo.repo_type}</span>
              )}
            </div>
          </div>
          {repo.github_url && (
            <a
              href={repo.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        {repo.description && (
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">{repo.description}</p>
        )}
        <div className="mt-3 text-xs text-slate-400">
          Added {formatRelativeTime(repo.created_at)}
        </div>
      </div>
    </motion.div>
  )
}

interface StageCardProps {
  stage: SDLCStage
  projectId: string
  documentCount: number
  index: number
}

function StageCard({ stage, projectId, documentCount, index }: StageCardProps) {
  const Icon = stageIcons[stage.name] || FileText
  const colors = stageColors[stage.name] || stageColors.Maintenance

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      <Link to={`/projects/${projectId}/stages/${stage.id}`}>
        <div className={cn(
          'group relative bg-white rounded-2xl border p-6 hover:shadow-lg transition-all duration-300',
          colors.border,
          'hover:border-slate-300'
        )}>
          {/* Icon */}
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl mb-4',
            colors.bg,
            colors.text
          )}>
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{stage.name}</h3>
          {stage.description && (
            <p className="text-sm text-slate-500 line-clamp-2 mb-4">{stage.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              <span>{documentCount} {documentCount === 1 ? 'document' : 'documents'}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </div>

          {/* Hover indicator */}
          <div className={cn(
            'absolute inset-x-0 bottom-0 h-1 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity',
            colors.bg.replace('50', '400')
          )} style={{
            background: `linear-gradient(90deg, ${colors.text.replace('text-', 'var(--color-').replace('600', '500)')} 0%, ${colors.text.replace('text-', 'var(--color-').replace('600', '400)')} 100%)`
          }} />
        </div>
      </Link>
    </motion.div>
  )
}
