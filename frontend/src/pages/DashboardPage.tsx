import { Link } from 'react-router-dom'
import {
  FolderOpen,
  FileText,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import { useSDLCProjects } from '@/hooks/useSDLCProjects'
import { useDocuments } from '@/hooks/useDocuments'
import { PageLoading } from '@/components/common/Loading'
import { formatDate, formatRelativeTime, getStatusColor, getStatusLabel, cn } from '@/utils/helpers'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: projects, isLoading: projectsLoading } = useSDLCProjects()
  const { data: documents, isLoading: documentsLoading } = useDocuments()

  if (projectsLoading || documentsLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  const recentProjects = projects?.slice(0, 3) || []
  const recentDocuments = documents?.slice(0, 5) || []
  const completedDocs = documents?.filter(d => d.status === 'completed').length || 0

  const stats = [
    {
      label: 'Total Projects',
      value: projects?.length || 0,
      icon: FolderOpen,
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-600',
    },
    {
      label: 'Documents',
      value: documents?.length || 0,
      icon: FileText,
      color: 'from-accent-500 to-accent-600',
      bgColor: 'bg-accent-50',
      textColor: 'text-accent-600',
    },
    {
      label: 'Completed',
      value: completedDocs,
      icon: CheckCircle2,
      color: 'from-success-500 to-success-600',
      bgColor: 'bg-success-50',
      textColor: 'text-success-600',
    },
  ]

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900" />

          {/* Animated gradient orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />

          {/* Content */}
          <div className="relative px-8 py-12 md:px-12 md:py-16">
            <div className="flex items-start justify-between">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm mb-4"
                >
                  <Sparkles className="h-4 w-4 text-accent-400" />
                  <span>AI-Powered Documentation</span>
                </motion.div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Welcome back, {user?.name?.split(' ')[0] || 'Developer'}
                </h1>
                <p className="text-lg text-slate-300 max-w-xl">
                  Generate professional documentation for your projects with the power of AI.
                  Fast, accurate, and always up-to-date.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/projects/new">
                    <Button
                      size="lg"
                      leftIcon={<Plus className="h-5 w-5" />}
                      className="shadow-xl shadow-primary-500/20"
                    >
                      New Project
                    </Button>
                  </Link>
                  <Link to="/documents">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      View Documents
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Floating illustration */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="hidden lg:block"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl blur-2xl opacity-30" />
                  <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                    </div>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="text-slate-400">
                        <span className="text-accent-400">const</span>{' '}
                        <span className="text-white">docs</span> ={' '}
                        <span className="text-primary-400">generate</span>
                        <span className="text-slate-400">(</span>
                      </div>
                      <div className="pl-4 text-slate-400">
                        <span className="text-slate-500">// Your code here</span>
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-400">)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card variant="elevated" className="relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl',
                    stat.bgColor
                  )}>
                    <stat.icon className={cn('h-7 w-7', stat.textColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
                {/* Decorative gradient */}
                <div className={cn(
                  'absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10',
                  `bg-gradient-to-br ${stat.color}`
                )} />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/projects/new">
              <Card
                interactive
                variant="gradient"
                className="group relative overflow-hidden"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-shadow">
                    <Plus className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                      Create New Project
                    </h3>
                    <p className="text-sm text-slate-500">
                      Upload code or connect your GitHub repository
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/documents">
              <Card
                interactive
                variant="gradient"
                className="group relative overflow-hidden"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/25 group-hover:shadow-xl group-hover:shadow-accent-500/30 transition-shadow">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-accent-600 transition-colors">
                      View All Documents
                    </h3>
                    <p className="text-sm text-slate-500">
                      Manage and export your documentation
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          </div>
        </motion.div>

        {/* Recent Activity Grid */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card variant="default" padding="none">
            <CardHeader className="flex items-center justify-between border-b border-slate-100 px-6 py-4 mb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                  <FolderOpen className="h-5 w-5 text-primary-600" />
                </div>
                <CardTitle className="text-base">Recent Projects</CardTitle>
              </div>
              <Link
                to="/projects"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {recentProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <FolderOpen className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No projects yet</p>
                  <p className="mt-1 text-xs text-slate-400">Create your first project to get started</p>
                  <Link to="/projects/new" className="mt-4 inline-block">
                    <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                      Create Project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-primary-50 transition-colors">
                            <FolderOpen className="h-5 w-5 text-slate-500 group-hover:text-primary-600 transition-colors" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                              {project.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(project.created_at)}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card variant="default" padding="none">
            <CardHeader className="flex items-center justify-between border-b border-slate-100 px-6 py-4 mb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50">
                  <FileText className="h-5 w-5 text-accent-600" />
                </div>
                <CardTitle className="text-base">Recent Documents</CardTitle>
              </div>
              <Link
                to="/documents"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {recentDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No documents yet</p>
                  <p className="mt-1 text-xs text-slate-400">Create a project first, then generate docs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <Link
                        to={`/documents/${doc.id}/edit`}
                        className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-accent-50 transition-colors">
                            <FileText className="h-5 w-5 text-slate-500 group-hover:text-accent-600 transition-colors" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 group-hover:text-accent-600 transition-colors">
                              {doc.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {formatDate(doc.updated_at)}
                            </div>
                          </div>
                        </div>
                        <span className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          getStatusColor(doc.status)
                        )}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tips Section */}
        <motion.div variants={itemVariants}>
          <Card
            variant="outline"
            className="bg-gradient-to-r from-primary-50/50 to-accent-50/50 border-primary-100"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Pro Tip</h3>
                <p className="text-sm text-slate-600">
                  Connect your GitHub repository for automatic code analysis and better documentation suggestions.
                  The AI works best when it can understand your full project structure.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
