import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Github, FolderGit2, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '@/components/common/Layout'
import { Card } from '@/components/common/Card'
import { useAddRepository, useSDLCProject } from '@/hooks/useSDLCProjects'
import { useProjectContext } from '@/context/ProjectContext'
import { cn } from '@/utils/helpers'

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

const repoTypes = [
  { id: 'frontend', label: 'Frontend', description: 'React, Vue, Angular, etc.' },
  { id: 'backend', label: 'Backend', description: 'Node.js, Python, Java, etc.' },
  { id: 'api', label: 'API', description: 'REST, GraphQL, gRPC, etc.' },
  { id: 'mobile', label: 'Mobile', description: 'iOS, Android, React Native, etc.' },
  { id: 'infrastructure', label: 'Infrastructure', description: 'Terraform, Kubernetes, etc.' },
  { id: 'other', label: 'Other', description: 'Libraries, tools, utilities, etc.' },
]

export default function AddRepositoryPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const { setBreadcrumbItems, setCurrentProject } = useProjectContext()

  const { data: project } = useSDLCProject(projectId || '')
  const addRepository = useAddRepository()

  const [githubUrl, setGithubUrl] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [repoType, setRepoType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Set breadcrumb
  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      setBreadcrumbItems([
        { label: 'Projects', href: '/projects' },
        { label: project.name, href: `/projects/${project.id}` },
        { label: 'Add Repository' },
      ])
    }
    return () => {
      setBreadcrumbItems([])
    }
  }, [project, setBreadcrumbItems, setCurrentProject])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!githubUrl.trim()) {
      setError('GitHub URL is required')
      return
    }

    if (!projectId) return

    addRepository.mutate(
      {
        projectId,
        data: {
          github_url: githubUrl.trim(),
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          repo_type: repoType || undefined,
        },
      },
      {
        onSuccess: () => {
          navigate(`/projects/${projectId}`)
        },
        onError: () => {
          setError('Failed to add repository. Please check the URL and try again.')
        },
      }
    )
  }

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-2xl py-8"
      >
        {/* Back Link */}
        <motion.div variants={itemVariants}>
          <Link
            to={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>
        </motion.div>

        {/* Header - Centered */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500 shadow-lg shadow-primary-500/30">
              <FolderGit2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Add Repository</h1>
          <p className="text-slate-500 mt-1">Connect a GitHub repository to {project?.name}</p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div variants={itemVariants}>
          <Card variant="elevated" padding="lg">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* GitHub URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Github className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className={cn(
                        'w-full rounded-xl border bg-white text-slate-900 pl-12 pr-4 py-3',
                        'placeholder:text-slate-400',
                        'transition-all duration-200',
                        'focus:outline-none',
                        'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'
                      )}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Optional Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Repository Name <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Leave empty to use GitHub repository name"
                    className={cn(
                      'w-full rounded-xl border bg-white text-slate-900 px-4 py-3',
                      'placeholder:text-slate-400',
                      'transition-all duration-200',
                      'focus:outline-none',
                      'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'
                    )}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this repository's purpose..."
                    className={cn(
                      'w-full rounded-xl border bg-white text-slate-900',
                      'placeholder:text-slate-400',
                      'transition-all duration-200',
                      'focus:outline-none',
                      'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
                      'px-4 py-3'
                    )}
                    rows={2}
                  />
                </div>

                {/* Repository Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Repository Type <span className="text-slate-400">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {repoTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setRepoType(repoType === type.id ? '' : type.id)}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          repoType === type.id
                            ? 'border-primary-500 bg-primary-50 text-primary-900'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <p className={cn(
                          'font-medium text-sm',
                          repoType === type.id ? 'text-primary-900' : 'text-slate-900'
                        )}>
                          {type.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={addRepository.isPending || !githubUrl.trim()}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-5 py-3.5',
                    'bg-primary-500 hover:bg-primary-600',
                    'text-white font-semibold rounded-xl',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-200'
                  )}
                >
                  {addRepository.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Adding Repository...
                    </>
                  ) : (
                    <>
                      Add Repository
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div variants={itemVariants} className="mt-6">
          <Card variant="ghost" className="bg-slate-50/50">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100">
                <Github className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">What happens next?</h3>
                <p className="text-sm text-slate-600">
                  We'll clone and analyze your repository to understand its structure,
                  dependencies, and code patterns. This helps generate more accurate
                  and relevant documentation.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
