import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Github, FileUp, ArrowRight, Sparkles, Code2, FileText, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import GitHubInput from '@/components/projects/GitHubInput'
import TemplateUpload from '@/components/projects/TemplateUpload'
import { projectsApi } from '@/api/projects'
import { useSession } from '@/context/SessionContext'
import { cn } from '@/utils/helpers'

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
    transition: { duration: 0.5 },
  },
}

export default function HomePage() {
  const navigate = useNavigate()
  const { createDocument, setActiveDocument } = useSession()
  const [githubUrl, setGithubUrl] = useState('')
  const [githubError, setGithubError] = useState('')
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [isValidUrl, setIsValidUrl] = useState(false)

  // Create project from GitHub
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const project = await projectsApi.createFromGitHub({
        github_url: githubUrl,
        name: extractRepoName(githubUrl),
      })
      return project
    },
    onSuccess: async (project) => {
      const doc = createDocument({
        projectId: project.id,
        githubUrl: githubUrl,
        templateFile: templateFile || undefined,
        status: 'analyzing',
      })
      setActiveDocument(doc.id)

      if (templateFile) {
        toast.success('Project created! Analyzing repository...')
        navigate(`/documents/${doc.id}/review`)
      } else {
        navigate('/select-template', {
          state: {
            projectId: project.id,
            documentId: doc.id
          }
        })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!githubUrl.trim()) {
      setGithubError('GitHub URL is required')
      return
    }

    if (!isValidUrl) {
      setGithubError('Please enter a valid GitHub repository URL')
      return
    }

    createProjectMutation.mutate()
  }

  const extractRepoName = (url: string): string => {
    const match = url.match(/github\.com\/[\w-]+\/([\w.-]+)/)
    return match ? match[1].replace(/\.git$/, '') : 'Untitled Project'
  }

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-4xl"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="mb-10 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl blur-lg opacity-50" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Generate Documentation with AI
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Connect your GitHub repository and let AI analyze your codebase to create
            professional, comprehensive documentation in minutes.
          </p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div variants={itemVariants}>
          <Card variant="elevated" padding="lg" className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* GitHub URL Input */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-md">
                    <Github className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">GitHub Repository</h2>
                    <p className="text-sm text-slate-500">Enter the URL of your repository to analyze</p>
                  </div>
                  <span className="ml-auto rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
                    Required
                  </span>
                </div>
                <GitHubInput
                  value={githubUrl}
                  onChange={setGithubUrl}
                  onValidation={setIsValidUrl}
                  error={githubError}
                  onErrorClear={() => setGithubError('')}
                />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-slate-400 font-medium">and optionally</span>
                </div>
              </div>

              {/* Template Upload */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-md">
                    <FileUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Upload Template</h2>
                    <p className="text-sm text-slate-500">Use your own PDF or DOCX as a template</p>
                  </div>
                  <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Optional
                  </span>
                </div>
                <TemplateUpload
                  file={templateFile}
                  onFileSelect={setTemplateFile}
                  onFileClear={() => setTemplateFile(null)}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={createProjectMutation.isPending}
                  disabled={!githubUrl.trim() || createProjectMutation.isPending}
                  leftIcon={<Sparkles className="h-5 w-5" />}
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  {createProjectMutation.isPending
                    ? 'Processing...'
                    : templateFile
                      ? 'Analyze & Continue'
                      : 'Continue to Template Selection'
                  }
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Features Grid */}
        <motion.div variants={itemVariants} className="mt-10 grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<Github className="h-6 w-6" />}
            title="GitHub Integration"
            description="Analyze any public or private repository directly"
            color="slate"
          />
          <FeatureCard
            icon={<Code2 className="h-6 w-6" />}
            title="Code Analysis"
            description="AI understands your codebase structure and patterns"
            color="primary"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Instant Generation"
            description="Get professional docs in minutes, not hours"
            color="accent"
          />
        </motion.div>

        {/* How it works */}
        <motion.div variants={itemVariants} className="mt-10">
          <Card variant="ghost" className="bg-gradient-to-r from-primary-50/50 to-accent-50/50 border border-primary-100">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-md shadow-primary-500/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">How it works</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">1</span>
                    Connect GitHub
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">2</span>
                    Choose template
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">3</span>
                    Review sections
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">4</span>
                    Export docs
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: 'primary' | 'accent' | 'slate'
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <Card variant="elevated" className="h-full hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className={cn(
        'mb-3 inline-flex rounded-lg p-2.5',
        colorClasses[color]
      )}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </Card>
  )
}
