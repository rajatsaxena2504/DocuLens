import { Link, useLocation, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  ChevronRight,
  Plus,
  FolderGit2,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useSDLCStages, useSDLCProject } from '@/hooks/useSDLCProjects'
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
const stageColors: Record<string, string> = {
  Requirements: 'text-blue-400 bg-blue-500/20',
  Design: 'text-purple-400 bg-purple-500/20',
  Development: 'text-green-400 bg-green-500/20',
  Testing: 'text-amber-400 bg-amber-500/20',
  Deployment: 'text-rose-400 bg-rose-500/20',
  Maintenance: 'text-slate-400 bg-slate-500/20',
}

interface ProjectSidebarProps {
  className?: string
}

export default function ProjectSidebar({ className }: ProjectSidebarProps) {
  const location = useLocation()
  const { projectId, stageId } = useParams<{ projectId: string; stageId?: string }>()

  const { data: stages = [], isLoading: stagesLoading } = useSDLCStages()
  const { data: project, isLoading: projectLoading } = useSDLCProject(projectId || '')

  if (!projectId) return null

  const isLoading = stagesLoading || projectLoading

  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Back to Projects */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <Link
          to="/projects"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>All Projects</span>
        </Link>
      </div>

      {/* Project Name */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-5 bg-slate-700 rounded w-3/4 mb-1" />
            <div className="h-3 bg-slate-700 rounded w-1/2" />
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-white truncate">
              {project?.name}
            </h2>
            <p className="text-xs text-slate-400 truncate">
              {project?.repositories?.length || 0} repositories
            </p>
          </div>
        )}
      </div>

      {/* SDLC Stages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-4">
          <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            SDLC Stages
          </h3>
          <nav className="space-y-1">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-2">
                  <div className="h-8 w-8 bg-slate-700 rounded-lg" />
                  <div className="h-4 bg-slate-700 rounded w-24" />
                </div>
              ))
            ) : (
              sortedStages.map((stage) => (
                <StageNavItem
                  key={stage.id}
                  stage={stage}
                  projectId={projectId}
                  isActive={stageId === stage.id}
                  documentCount={project?.stage_document_counts?.[stage.id] || 0}
                />
              ))
            )}
          </nav>
        </div>

        {/* Repositories Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Repositories
            </h3>
            <Link
              to={`/projects/${projectId}/repositories/add`}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Add repository"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>
          <nav className="space-y-1">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-2">
                  <div className="h-6 w-6 bg-slate-700 rounded" />
                  <div className="h-3 bg-slate-700 rounded w-20" />
                </div>
              ))
            ) : project?.repositories?.length ? (
              project.repositories.map((repo) => (
                <Link
                  key={repo.id}
                  to={`/projects/${projectId}/repositories/${repo.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    location.pathname.includes(`/repositories/${repo.id}`)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  <FolderGit2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate flex-1">{repo.name}</span>
                  {repo.repo_type && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                      {repo.repo_type}
                    </span>
                  )}
                </Link>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-500">
                No repositories added yet
              </p>
            )}
          </nav>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <Link
          to={`/projects/${projectId}/documents/new`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <FileText className="h-4 w-4" />
          New Document
        </Link>
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
  const colorClass = stageColors[stage.name] || 'text-slate-400 bg-slate-500/20'
  const [textColor, bgColor] = colorClass.split(' ')

  return (
    <Link
      to={`/projects/${projectId}/stages/${stage.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
        isActive
          ? 'bg-slate-800/80 text-white'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
      )}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        isActive ? bgColor : 'bg-slate-800/50 group-hover:bg-slate-700'
      )}>
        <Icon className={cn('h-4 w-4', isActive ? textColor : 'text-slate-400 group-hover:text-white')} />
      </div>
      <span className="flex-1 truncate">{stage.name}</span>
      {documentCount > 0 && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          isActive ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-500'
        )}>
          {documentCount}
        </span>
      )}
      {isActive && (
        <motion.div layoutId="activeStage">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </motion.div>
      )}
    </Link>
  )
}
