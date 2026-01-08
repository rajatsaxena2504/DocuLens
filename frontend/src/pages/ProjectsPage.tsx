import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  FolderOpen,
  Search,
  MoreVertical,
  Trash2,
  Archive,
  Clock,
  BookOpen,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  ArrowRight,
  Building2,
  UserPlus,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { useSDLCProjects, useDeleteSDLCProject } from '@/hooks/useSDLCProjects'
import { useOrganization } from '@/context/OrganizationContext'
import { cn, formatRelativeTime } from '@/utils/helpers'
import type { SDLCProject } from '@/types'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { currentOrg, organizations, isLoading: orgLoading } = useOrganization()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')

  const { data: projects = [], isLoading, error } = useSDLCProjects()
  const deleteProject = useDeleteSDLCProject()

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await deleteProject.mutateAsync(projectId)
    }
  }

  // Show "no org" state if user has no organizations
  if (!orgLoading && organizations.length === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
              <Building2 className="h-10 w-10 text-slate-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Join an Organization
          </h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            You need to be part of an organization to view and create projects.
            Request to join an organization to get started.
          </p>
          <Button
            size="lg"
            leftIcon={<UserPlus className="h-5 w-5" />}
            onClick={() => navigate('/organizations')}
          >
            Browse Organizations
          </Button>
        </div>
      </Layout>
    )
  }

  // Show "select org" state if user has orgs but none selected
  if (!orgLoading && !currentOrg && organizations.length > 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center">
              <Building2 className="h-10 w-10 text-primary-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Select an Organization
          </h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Choose an organization from the dropdown in the header to view its projects.
          </p>
          <Button
            variant="secondary"
            onClick={() => navigate('/organizations')}
          >
            View My Organizations
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your SDLC documentation projects
              </p>
            </div>
            <Link to="/projects/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                New Project
              </Button>
            </Link>
          </div>

          {/* Search and filters */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                    statusFilter === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <ProjectsGridSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-error-600">Failed to load projects. Please try again.</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState searchQuery={searchQuery} statusFilter={statusFilter} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

interface ProjectCardProps {
  project: SDLCProject
  onDelete: (projectId: string, e: React.MouseEvent) => void
}

function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Link to={`/projects/${project.id}`}>
      <div className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ease-out">
        {/* Status badge & menu */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {project.status === 'archived' && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
              <Archive className="h-3 w-3" />
              Archived
            </span>
          )}
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => onDelete(project.id, e)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-3">
          <FolderOpen className="h-5 w-5" />
        </div>

        {/* Content */}
        <h3 className="text-base font-semibold text-slate-900 mb-1 truncate pr-12">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatRelativeTime(project.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}

function ProjectsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-lg border border-slate-200 p-5">
          <div className="h-10 w-10 bg-slate-100 rounded-lg mb-3" />
          <div className="h-5 bg-slate-100 rounded w-3/4 mb-2" />
          <div className="h-4 bg-slate-100 rounded w-full mb-3" />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  searchQuery: string
  statusFilter: string
}

const sdlcStages = [
  { name: 'Requirements', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Design', icon: Pencil, color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Development', icon: Code2, color: 'text-green-600', bg: 'bg-green-50' },
  { name: 'Testing', icon: TestTube2, color: 'text-amber-600', bg: 'bg-amber-50' },
  { name: 'Deployment', icon: Rocket, color: 'text-rose-600', bg: 'bg-rose-50' },
  { name: 'Maintenance', icon: Wrench, color: 'text-slate-600', bg: 'bg-slate-100' },
]

function EmptyState({ searchQuery, statusFilter }: EmptyStateProps) {
  const hasFilters = searchQuery || statusFilter !== 'all'

  if (hasFilters) {
    return (
      <div className="text-center py-16">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
            <FolderOpen className="h-7 w-7 text-slate-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No projects found</h3>
        <p className="text-sm text-slate-500">
          Try adjusting your search or filters.
        </p>
      </div>
    )
  }

  return (
    <div className="py-8">
      {/* Welcome Hero */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-600">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome to DocuLens
        </h2>
        <p className="text-slate-500 max-w-lg mx-auto mb-6">
          Generate comprehensive documentation for every phase of your software development lifecycle.
        </p>
        <Link to="/projects/new">
          <Button size="lg" leftIcon={<Plus className="h-5 w-5" />}>
            Create Your First Project
          </Button>
        </Link>
      </div>

      {/* SDLC Pipeline */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-center text-sm font-semibold text-slate-900 mb-5">
          Complete SDLC Documentation Coverage
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {sdlcStages.map((stage, index) => {
            const Icon = stage.icon
            return (
              <div key={stage.name} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-lg mb-1.5',
                    stage.bg
                  )}>
                    <Icon className={cn('h-5 w-5', stage.color)} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{stage.name}</span>
                </div>
                {index < sdlcStages.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-slate-300 mx-2 hidden sm:block" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ease-out">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-3">
            <Code2 className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-1">Code Analysis</h4>
          <p className="text-sm text-slate-500">
            Connect GitHub repositories for automatic code analysis
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ease-out">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600 mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-1">AI Generation</h4>
          <p className="text-sm text-slate-500">
            Generate documentation tailored to each SDLC phase
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ease-out">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50 text-success-600 mb-3">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-1">Export Bundle</h4>
          <p className="text-sm text-slate-500">
            Export all documentation as organized files
          </p>
        </div>
      </div>
    </div>
  )
}
