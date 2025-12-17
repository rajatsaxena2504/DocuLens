import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, FolderOpen, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Input from '@/components/common/Input'
import { Card } from '@/components/common/Card'
import { useCreateSDLCProject } from '@/hooks/useSDLCProjects'
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

export default function NewProjectPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createProject = useCreateSDLCProject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined
      },
      {
        onSuccess: (project) => {
          navigate(`/projects/${project.id}`)
        },
        onError: () => {
          setError('Failed to create project. Please try again.')
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
        className="mx-auto max-w-2xl"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
              <FolderOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
              <p className="text-slate-500">Start a new SDLC documentation project</p>
            </div>
          </div>
        </motion.div>

        {/* Main Form Card */}
        <motion.div variants={itemVariants}>
          <Card variant="elevated" padding="lg">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <Input
                  id="name"
                  label="Project Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Software Project"
                  required
                  autoFocus
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your project and its purpose..."
                    className={cn(
                      'w-full rounded-xl border bg-white text-slate-900',
                      'placeholder:text-slate-400',
                      'transition-all duration-200',
                      'focus:outline-none',
                      'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
                      'px-4 py-3'
                    )}
                    rows={3}
                  />
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
                  disabled={createProject.isPending || !name.trim()}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-5 py-3',
                    'bg-gradient-to-r from-primary-500 to-accent-500',
                    'text-white font-medium rounded-xl',
                    'shadow-lg shadow-primary-500/25',
                    'hover:shadow-xl hover:shadow-primary-500/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-200'
                  )}
                >
                  {createProject.isPending ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Project
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Help Card */}
        <motion.div variants={itemVariants} className="mt-6">
          <Card variant="ghost" className="bg-slate-50/50">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-md shadow-primary-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">What's next?</h3>
                <p className="text-sm text-slate-600">
                  After creating your project, you can add GitHub repositories and start generating
                  AI-powered documentation for each phase of your software development lifecycle -
                  from requirements to deployment and maintenance.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Steps Preview */}
        <motion.div variants={itemVariants} className="mt-8">
          <h3 className="text-sm font-medium text-slate-700 mb-4">How it works</h3>
          <div className="flex items-center gap-4">
            {[
              { num: 1, label: 'Create Project', active: true },
              { num: 2, label: 'Add Repositories' },
              { num: 3, label: 'Generate Docs' },
            ].map((step, index) => (
              <div key={step.num} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                    step.active
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}>
                    {step.num}
                  </div>
                  <span className={cn(
                    'text-sm',
                    step.active ? 'text-slate-900 font-medium' : 'text-slate-400'
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < 2 && (
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
