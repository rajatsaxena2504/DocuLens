import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  FileText,
  Code,
  BookOpen,
  Settings,
  FileCode,
  ArrowRight,
  ArrowLeft,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { PageLoading } from '@/components/common/Loading'
import { templatesApi } from '@/api/sections'
import { documentsApi } from '@/api/documents'
import { useSession } from '@/context/SessionContext'
import type { DocumentType } from '@/types'
import { cn } from '@/utils/helpers'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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

// Template icons mapping
const templateIcons: Record<string, React.ReactNode> = {
  'Requirements Document': <FileText className="h-7 w-7" />,
  'Design Document': <Settings className="h-7 w-7" />,
  'Technical Specification': <Code className="h-7 w-7" />,
  'Technical Specification Document': <Code className="h-7 w-7" />,
  'API Documentation': <FileCode className="h-7 w-7" />,
  'User Guide': <BookOpen className="h-7 w-7" />,
  'README': <FileText className="h-7 w-7" />,
  'Developer Guide': <Code className="h-7 w-7" />,
}

// Template colors
const templateColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  'Requirements Document': {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    gradient: 'from-violet-500 to-violet-600',
  },
  'Design Document': {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    gradient: 'from-amber-500 to-amber-600',
  },
  'Technical Specification': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    gradient: 'from-cyan-500 to-cyan-600',
  },
  'Technical Specification Document': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    gradient: 'from-cyan-500 to-cyan-600',
  },
  'API Documentation': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  'User Guide': {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    gradient: 'from-rose-500 to-rose-600',
  },
  'README': {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    gradient: 'from-slate-500 to-slate-600',
  },
  'Developer Guide': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    gradient: 'from-indigo-500 to-indigo-600',
  },
}

// Template descriptions for display
const templateDescriptions: Record<string, string> = {
  'Requirements Document': 'Define project requirements, user stories, and acceptance criteria',
  'Design Document': 'Document system design, architecture decisions, and component interactions',
  'Technical Specification': 'Detailed technical specs including APIs, data models, and algorithms',
  'Technical Specification Document': 'Detailed technical specs including APIs, data models, and algorithms',
  'API Documentation': 'Document REST/GraphQL APIs with endpoints, parameters, and examples',
  'User Guide': 'End-user documentation with tutorials, features, and troubleshooting',
  'README': 'Project overview, setup instructions, and quick start guide',
  'Developer Guide': 'Guide for developers contributing to the project',
}

const defaultColors = {
  bg: 'bg-primary-50',
  text: 'text-primary-600',
  border: 'border-primary-200',
  gradient: 'from-primary-500 to-primary-600',
}

export default function TemplateSelectionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { updateDocument } = useSession()

  const { projectId, documentId } = (location.state as {
    projectId?: string
    documentId?: string
  }) || {}

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  })

  const createDocumentMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!projectId) throw new Error('Project ID is required')

      const template = templates?.find(t => t.id === templateId)
      const document = await documentsApi.create({
        project_id: projectId,
        document_type_id: templateId,
        title: `${template?.name || 'Documentation'} - ${new Date().toLocaleDateString()}`,
      })

      return { document, template }
    },
    onSuccess: ({ document, template }) => {
      if (documentId) {
        updateDocument(documentId, {
          templateId: document.document_type_id || undefined,
          templateName: template?.name,
          title: document.title,
          status: 'ready',
        })
      }

      toast.success('Template selected! Let\'s configure sections.')
      navigate(`/documents/${document.id}/review`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create document')
    },
  })

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
  }

  const handleContinue = () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template')
      return
    }
    createDocumentMutation.mutate(selectedTemplateId)
  }

  useEffect(() => {
    if (!projectId) {
      toast.error('Please start by entering a GitHub repository')
      navigate('/')
    }
  }, [projectId, navigate])

  if (templatesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <PageLoading />
        </div>
      </Layout>
    )
  }

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-5xl"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to start
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Choose a Template</h1>
              <p className="text-slate-500">Select a documentation type for your project</p>
            </div>
          </div>
        </motion.div>

        {/* Template Grid */}
        <motion.div variants={itemVariants}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {templates?.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TemplateCard
                    template={template}
                    isSelected={selectedTemplateId === template.id}
                    onSelect={() => handleSelectTemplate(template.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Selected Template Info */}
        <AnimatePresence>
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8"
            >
              <Card variant="ghost" className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-md">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      Selected: {selectedTemplate.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {templateDescriptions[selectedTemplate.name] || selectedTemplate.description}
                    </p>
                  </div>
                  <Button
                    onClick={handleContinue}
                    isLoading={createDocumentMutation.isPending}
                    leftIcon={<Sparkles className="h-5 w-5" />}
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                  >
                    Configure Sections
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons (shown when no template selected) */}
        {!selectedTemplate && (
          <motion.div variants={itemVariants} className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
            <p className="text-sm text-slate-500">
              Select a template above to continue
            </p>
          </motion.div>
        )}

        {/* Tips */}
        <motion.div variants={itemVariants} className="mt-8">
          <Card variant="ghost" className="bg-slate-50/50">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Not sure which template?</h3>
                <p className="text-sm text-slate-600">
                  Start with <span className="font-medium">Technical Specification</span> for comprehensive project docs,
                  or <span className="font-medium">README</span> for a quick project overview.
                  You can customize sections in the next step.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  )
}

interface TemplateCardProps {
  template: DocumentType
  isSelected: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const icon = templateIcons[template.name] || <FileText className="h-7 w-7" />
  const colors = templateColors[template.name] || defaultColors
  const description = templateDescriptions[template.name] || template.description || 'Documentation template'

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex flex-col items-start rounded-2xl border-2 bg-white p-6 text-left transition-all w-full h-full',
        isSelected
          ? 'border-primary-500 shadow-lg shadow-primary-500/10'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      )}
    >
      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 shadow-md"
          >
            <Check className="h-4 w-4 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div className={cn(
        'mb-4 rounded-xl p-3 transition-all',
        isSelected
          ? `bg-gradient-to-br ${colors.gradient} text-white shadow-md`
          : `${colors.bg} ${colors.text}`
      )}>
        {icon}
      </div>

      {/* Content */}
      <h3 className={cn(
        'mb-2 font-semibold transition-colors',
        isSelected ? 'text-primary-900' : 'text-slate-900'
      )}>
        {template.name}
      </h3>
      <p className="text-sm text-slate-500 line-clamp-2 flex-1">
        {description}
      </p>

      {/* System badge */}
      {template.is_system && (
        <span className={cn(
          'mt-4 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
          isSelected ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
        )}>
          Built-in
        </span>
      )}
    </motion.button>
  )
}
