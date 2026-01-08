import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, FolderOpen, ArrowRight } from 'lucide-react'
import Layout from '@/components/common/Layout'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useCreateSDLCProject } from '@/hooks/useSDLCProjects'
import { useOrganization } from '@/context/OrganizationContext'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { currentOrg, organizations, isLoading: orgLoading } = useOrganization()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createProject = useCreateSDLCProject()

  // Redirect users without org membership
  useEffect(() => {
    if (!orgLoading && organizations.length === 0) {
      toast.error('You need to join an organization first')
      navigate('/organizations')
    } else if (!orgLoading && !currentOrg) {
      toast.error('Please select an organization first')
      navigate('/organizations')
    }
  }, [orgLoading, organizations, currentOrg, navigate])

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
        className="mx-auto max-w-2xl py-8"
      >
        {/* Back link */}
        <motion.div variants={itemVariants}>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </motion.div>

        {/* Header - Centered */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500 shadow-lg shadow-primary-500/30">
              <FolderOpen className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
          <p className="text-sm text-slate-500 mt-1">Start a new SDLC documentation project</p>
        </motion.div>

        {/* Form Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your project..."
                className={cn(
                  'w-full rounded-lg border border-slate-200 bg-white text-slate-900',
                  'placeholder:text-slate-400',
                  'transition-colors duration-150',
                  'hover:border-slate-300',
                  'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                  'px-4 py-3'
                )}
                rows={3}
              />
            </div>

            {error && (
              <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-sm text-error-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={createProject.isPending}
              disabled={!name.trim()}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Create Project
            </Button>
          </form>
        </motion.div>

        {/* Help text */}
        <motion.div variants={itemVariants} className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-1.5">What's next?</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            After creating your project, you can add GitHub repositories and start generating
            AI-powered documentation for each phase of your software development lifecycle.
          </p>
        </motion.div>

        {/* Steps indicator */}
        <motion.div variants={itemVariants} className="mt-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">How it works</p>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {[
              { num: 1, label: 'Create Project', active: true },
              { num: 2, label: 'Add Repositories', active: false },
              { num: 3, label: 'Generate Docs', active: false },
            ].map((step, index) => (
              <div key={step.num} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    step.active
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}>
                    {step.num}
                  </div>
                  <span className={cn(
                    'text-sm hidden sm:inline',
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
