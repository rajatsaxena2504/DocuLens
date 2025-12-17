import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  Plus,
  FolderGit2,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useSDLCStages, useSDLCProject } from '@/hooks/useSDLCProjects'
import { useProjectContext } from '@/context/ProjectContext'
import type { SDLCStage } from '@/types'

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
const stageColors: Record<string, { icon: string; bg: string }> = {
  Requirements: { icon: 'text-blue-600', bg: 'bg-blue-50' },
  Design: { icon: 'text-purple-600', bg: 'bg-purple-50' },
  Development: { icon: 'text-green-600', bg: 'bg-green-50' },
  Testing: { icon: 'text-amber-600', bg: 'bg-amber-50' },
  Deployment: { icon: 'text-rose-600', bg: 'bg-rose-50' },
  Maintenance: { icon: 'text-slate-600', bg: 'bg-slate-100' },
}

interface ProjectSidebarProps {
  className?: string
}

export default function ProjectSidebar({ className }: ProjectSidebarProps) {
  const location = useLocation()
  const { projectId: urlProjectId, stageId } = useParams<{ projectId: string; stageId?: string }>()
  const { currentProject, currentStage } = useProjectContext()

  // Use URL projectId or fallback to context's currentProject
  const projectId = urlProjectId || currentProject?.id
  const activeStageId = stageId || currentStage?.id

  const { data: stages = [], isLoading: stagesLoading } = useSDLCStages()
  const { data: project, isLoading: projectLoading } = useSDLCProject(projectId || '')

  // If no project context at all, show nothing
  if (!projectId && !currentProject) return null

  // Use fetched project or currentProject from context
  const displayProject = project || currentProject

  const isLoading = stagesLoading || projectLoading
  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Back to Projects */}
      <div className="px-3 py-2.5 border-b border-slate-100">
        <Link
          to="/projects"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Projects</span>
        </Link>
      </div>

      {/* Project Name */}
      <div className="px-3 py-3 border-b border-slate-100">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-3/4 mb-1" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              {displayProject?.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {displayProject?.repositories?.length || 0} repositories
            </p>
          </div>
        )}
      </div>

      {/* SDLC Stages */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-3">
          <h3 className="px-2 text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Stages
          </h3>
          <nav className="space-y-0.5">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-2.5 px-2 py-1.5">
                  <div className="h-6 w-6 bg-slate-100 rounded-lg" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
              ))
            ) : (
              sortedStages.map((stage) => (
                <StageNavItem
                  key={stage.id}
                  stage={stage}
                  projectId={projectId!}
                  isActive={activeStageId === stage.id}
                  documentCount={displayProject?.stage_document_counts?.[stage.id] || 0}
                />
              ))
            )}
          </nav>
        </div>

        {/* Repositories Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Repos
            </h3>
            <Link
              to={`/projects/${projectId}/repositories/add`}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="Add repository"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
          <nav className="space-y-0.5">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-2 px-2 py-1.5">
                  <div className="h-4 w-4 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              ))
            ) : displayProject?.repositories?.length ? (
              displayProject.repositories.map((repo) => (
                <Link
                  key={repo.id}
                  to={`/projects/${projectId}/repositories/${repo.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                    location.pathname.includes(`/repositories/${repo.id}`)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <FolderGit2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate flex-1 text-sm">{repo.name}</span>
                </Link>
              ))
            ) : (
              <p className="px-2 py-1.5 text-xs text-slate-400">
                No repos yet
              </p>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}

interface StageNavItemProps {
  stage: SDLCStage
  projectId: string
  isActive: boolean
  documentCount: number
}

function StageNavItem({ stage, projectId, isActive, documentCount }: StageNavItemProps) {
  const Icon = stageIcons[stage.name] || FileText
  const colors = stageColors[stage.name] || { icon: 'text-slate-600', bg: 'bg-slate-100' }

  return (
    <Link
      to={`/projects/${projectId}/stages/${stage.id}`}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <div className={cn(
        'flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
        isActive ? colors.bg : 'bg-slate-100'
      )}>
        <Icon className={cn('h-3.5 w-3.5', isActive ? colors.icon : 'text-slate-400')} />
      </div>
      <span className="flex-1 truncate text-sm">{stage.name}</span>
      {documentCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
          {documentCount}
        </span>
      )}
    </Link>
  )
}
