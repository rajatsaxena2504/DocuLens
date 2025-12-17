import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  FolderOpen,
  Search,
  MoreVertical,
  Trash2,
  Edit3,
  Archive,
  Clock,
  Sparkles,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  ArrowRight,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { useSDLCProjects, useDeleteSDLCProject } from '@/hooks/useSDLCProjects'
import { cn, formatRelativeTime } from '@/utils/helpers'
import type { SDLCProject } from '@/types'

export default function ProjectsPage() {
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">SDLC Projects</h1>
              </div>
              <p className="mt-1 text-slate-500 max-w-xl">
                AI-powered documentation across your entire software development lifecycle
              </p>
            </div>
            <Link to="/projects/new">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-shadow"
              >
                <Plus className="h-5 w-5" />
                New Project
              </motion.button>
            </Link>
          </div>

          {/* Search and filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-medium transition-colors capitalize',
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
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <ProjectsGridSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Failed to load projects. Please try again.</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState searchQuery={searchQuery} statusFilter={statusFilter} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onDelete={handleDeleteProject}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </Layout>
  )
}

interface ProjectCardProps {
  project: SDLCProject
  index: number
  onDelete: (projectId: string, e: React.MouseEvent) => void
}

function ProjectCard({ project, index, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/projects/${project.id}`}>
        <div className="group relative bg-white rounded-2xl border border-slate-200 p-6 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300">
          {/* Status badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {project.status === 'archived' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">
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
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => onDelete(project.id, e)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 text-primary-600 mb-4 group-hover:scale-110 transition-transform">
            <FolderOpen className="h-6 w-6" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate pr-16">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-slate-500 line-clamp-2 mb-4">
              {project.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatRelativeTime(project.created_at)}</span>
            </div>
          </div>

          {/* Hover indicator */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
    </motion.div>
  )
}

function ProjectsGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-200 p-6">
          <div className="h-12 w-12 bg-slate-200 rounded-xl mb-4" />
          <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-full mb-4" />
          <div className="flex gap-4">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  searchQuery: string
  statusFilter: string
}

// SDLC stages for the pipeline visualization
const sdlcStages = [
  { name: 'Requirements', icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'Design', icon: Pencil, color: 'text-purple-500', bg: 'bg-purple-50' },
  { name: 'Development', icon: Code2, color: 'text-green-500', bg: 'bg-green-50' },
  { name: 'Testing', icon: TestTube2, color: 'text-amber-500', bg: 'bg-amber-50' },
  { name: 'Deployment', icon: Rocket, color: 'text-rose-500', bg: 'bg-rose-50' },
  { name: 'Maintenance', icon: Wrench, color: 'text-slate-500', bg: 'bg-slate-50' },
]

function EmptyState({ searchQuery, statusFilter }: EmptyStateProps) {
  const hasFilters = searchQuery || statusFilter !== 'all'

  if (hasFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <FolderOpen className="h-10 w-10 text-slate-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects found</h3>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      {/* Welcome Hero */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur-xl opacity-30" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-xl">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Welcome to DocuLens
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
          Generate comprehensive documentation for every phase of your software development lifecycle, powered by AI.
        </p>
        <Link to="/projects/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl transition-shadow"
          >
            <Plus className="h-5 w-5" />
            Create Your First Project
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </Link>
      </div>

      {/* SDLC Pipeline Visualization */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 border border-slate-200">
        <h3 className="text-center text-lg font-semibold text-slate-900 mb-6">
          Complete SDLC Documentation Coverage
        </h3>
        <div className="flex flex-wrap justify-center gap-4">
          {sdlcStages.map((stage, index) => {
            const Icon = stage.icon
            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-xl mb-2 shadow-sm',
                  stage.bg
                )}>
                  <Icon className={cn('h-7 w-7', stage.color)} />
                </div>
                <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                {index < sdlcStages.length - 1 && (
                  <div className="hidden lg:block absolute translate-x-[4.5rem]">
                    <ArrowRight className="h-5 w-5 text-slate-300" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
        <p className="text-center text-sm text-slate-500 mt-6">
          From requirements to maintenance — DocuLens helps you document every stage
        </p>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500 mb-4">
            <Code2 className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-2">Code Analysis</h4>
          <p className="text-sm text-slate-500">
            Connect your GitHub repositories and let AI analyze your codebase structure
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-500 mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-2">AI Generation</h4>
          <p className="text-sm text-slate-500">
            Generate documentation tailored to each SDLC phase with intelligent AI prompts
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-500 mb-4">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-2">Export Bundle</h4>
          <p className="text-sm text-slate-500">
            Export all your documentation as organized files ready for your team
          </p>
        </div>
      </div>
    </motion.div>
  )
}
