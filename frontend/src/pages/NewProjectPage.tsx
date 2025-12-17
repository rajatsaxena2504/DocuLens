import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Github, ArrowLeft, Sparkles, Code2, FolderGit2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import FileUpload from '@/components/projects/FileUpload'
import GitHubConnect from '@/components/projects/GitHubConnect'
import { useCreateProject, useCreateGitHubProject } from '@/hooks/useProjects'
import { cn } from '@/utils/helpers'
import { Link } from 'react-router-dom'

type SourceType = 'upload' | 'github'

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
  const [sourceType, setSourceType] = useState<SourceType>('upload')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const createProject = useCreateProject()
  const createGitHubProject = useCreateGitHubProject()

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    if (description) formData.append('description', description)

    createProject.mutate(formData, {
      onSuccess: (project) => {
        navigate(`/projects/${project.id}`)
      },
    })
  }

  const handleGitHubSubmit = (url: string) => {
    createGitHubProject.mutate(
      { github_url: url, name: name || undefined, description: description || undefined },
      {
        onSuccess: (project) => {
          navigate(`/projects/${project.id}`)
        },
      }
    )
  }

  const sourceOptions = [
    {
      id: 'upload',
      name: 'Upload Files',
      description: 'Upload a ZIP file with your code',
      icon: Upload,
      color: 'primary',
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect to a GitHub repository',
      icon: Github,
      color: 'accent',
    },
  ] as const

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-3xl"
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
              <FolderGit2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
              <p className="text-slate-500">Add your code to generate AI-powered documentation</p>
            </div>
          </div>
        </motion.div>

        {/* Source Type Selection */}
        <motion.div variants={itemVariants} className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Choose Source
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            {sourceOptions.map((option) => {
              const isSelected = sourceType === option.id
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  onClick={() => setSourceType(option.id)}
                  className={cn(
                    'relative flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200',
                    isSelected
                      ? option.color === 'primary'
                        ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                        : 'border-accent-500 bg-accent-50/50 shadow-lg shadow-accent-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  )}
                >
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl transition-all',
                    isSelected
                      ? option.color === 'primary'
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25'
                        : 'bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/25'
                      : 'bg-slate-100'
                  )}>
                    <Icon className={cn(
                      'h-6 w-6 transition-colors',
                      isSelected ? 'text-white' : 'text-slate-500'
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      'font-semibold transition-colors',
                      isSelected
                        ? option.color === 'primary' ? 'text-primary-900' : 'text-accent-900'
                        : 'text-slate-900'
                    )}>
                      {option.name}
                    </p>
                    <p className="text-sm text-slate-500">{option.description}</p>
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="selected-source"
                      className={cn(
                        'absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-white',
                        option.color === 'primary' ? 'bg-primary-500' : 'bg-accent-500'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Main Form Card */}
        <motion.div variants={itemVariants}>
          <Card variant="elevated" padding="lg">
            {/* Project Details */}
            <div className="mb-8 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Code2 className="h-4 w-4 text-slate-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Project Details</h2>
              </div>

              <Input
                id="name"
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
                required={sourceType === 'upload'}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your project..."
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
            </div>

            {/* Source-specific Content */}
            <AnimatePresence mode="wait">
              {sourceType === 'upload' ? (
                <motion.form
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleUploadSubmit}
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
                      <Upload className="h-4 w-4 text-primary-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Upload Code</h2>
                  </div>

                  <FileUpload
                    selectedFile={file}
                    onFileSelect={setFile}
                    onClear={() => setFile(null)}
                  />

                  <Button
                    type="submit"
                    className="mt-8 w-full"
                    size="lg"
                    isLoading={createProject.isPending}
                    disabled={!file || !name}
                    leftIcon={<Sparkles className="h-5 w-5" />}
                  >
                    Create Project & Generate Docs
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="github"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-100">
                      <Github className="h-4 w-4 text-accent-600" />
                    </div>
                    <h2 className="font-semibold text-slate-900">Connect GitHub</h2>
                  </div>

                  <GitHubConnect
                    onSubmit={handleGitHubSubmit}
                    isLoading={createGitHubProject.isPending}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
                <h3 className="font-semibold text-slate-900 mb-1">How it works</h3>
                <p className="text-sm text-slate-600">
                  Upload your code or connect GitHub, and our AI will analyze your project structure,
                  understand your codebase, and suggest relevant documentation sections. You can then
                  customize and generate professional documentation in seconds.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}
