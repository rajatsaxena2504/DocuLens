import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  ChevronRight,
  Edit3,
  Check,
  X,
  Layers,
  Search,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { Card } from '@/components/common/Card'
import Button from '@/components/common/Button'
import { useTemplatesLibrary, useUpdateSectionDescription } from '@/hooks/useSections'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'

const STAGES = ['Requirements', 'Design', 'Development', 'Testing', 'Deployment', 'Maintenance']

const stageColors: Record<string, string> = {
  Requirements: 'bg-blue-100 text-blue-700 border-blue-200',
  Design: 'bg-purple-100 text-purple-700 border-purple-200',
  Development: 'bg-green-100 text-green-700 border-green-200',
  Testing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Deployment: 'bg-orange-100 text-orange-700 border-orange-200',
  Maintenance: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function TemplateLibraryPage() {
  const { data: templates, isLoading, refetch } = useTemplatesLibrary()
  const updateSectionDescription = useUpdateSectionDescription()

  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editedDescription, setEditedDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  // Group templates by stage
  const templatesByStage = useMemo(() => {
    if (!templates) return {}

    const grouped: Record<string, typeof templates> = {}
    for (const stage of STAGES) {
      grouped[stage] = templates.filter(t => t.stage === stage)
    }
    return grouped
  }, [templates])

  // Filter templates based on search and stage
  const filteredTemplates = useMemo(() => {
    if (!templates) return []

    let filtered = templates

    if (selectedStage) {
      filtered = filtered.filter(t => t.stage === selectedStage)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.sections?.some(s =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        )
      )
    }

    return filtered
  }, [templates, selectedStage, searchQuery])

  const toggleTemplate = (templateId: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  const startEditing = (sectionId: string, currentDescription: string) => {
    setEditingSection(sectionId)
    setEditedDescription(currentDescription || '')
  }

  const cancelEditing = () => {
    setEditingSection(null)
    setEditedDescription('')
  }

  const saveDescription = (sectionId: string) => {
    updateSectionDescription.mutate(
      { sectionId, description: editedDescription },
      {
        onSuccess: () => {
          toast.success('Section description updated')
          setEditingSection(null)
          setEditedDescription('')
          refetch()
        },
        onError: () => {
          toast.error('Failed to update description')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
              <Layers className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Template Library</h1>
              <p className="text-sm text-slate-500">
                Browse document templates and customize section descriptions
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates or sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Stage filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedStage(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                !selectedStage
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              All
            </button>
            {STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage === selectedStage ? null : stage)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  selectedStage === stage
                    ? stageColors[stage]
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {/* Template Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {STAGES.map(stage => {
            const count = templatesByStage[stage]?.length || 0
            return (
              <Card
                key={stage}
                className={cn(
                  'p-3 cursor-pointer transition-all',
                  selectedStage === stage && 'ring-2 ring-primary-500'
                )}
                onClick={() => setSelectedStage(stage === selectedStage ? null : stage)}
              >
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{stage}</p>
              </Card>
            )
          })}
        </div>

        {/* Templates List */}
        <div className="space-y-3">
          {filteredTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No templates found</p>
            </Card>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                {/* Template Header */}
                <button
                  onClick={() => toggleTemplate(template.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <motion.div
                    animate={{ rotate: expandedTemplates.has(template.id) ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{template.name}</h3>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium border',
                        stageColors[template.stage || 'Development']
                      )}>
                        {template.stage}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{template.description}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900">
                      {template.sections?.length || 0}
                    </span>
                    <p className="text-xs text-slate-500">sections</p>
                  </div>
                </button>

                {/* Sections */}
                <AnimatePresence>
                  {expandedTemplates.has(template.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                          Sections in this template
                        </h4>
                        <div className="space-y-2">
                          {template.sections?.map((section, index) => (
                            <div
                              key={section.id}
                              className="bg-white rounded-lg border border-slate-200 p-3"
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-medium text-slate-600">
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-slate-900 text-sm">
                                    {section.name}
                                  </h5>

                                  {editingSection === section.id ? (
                                    <div className="mt-2">
                                      <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        rows={3}
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-2 mt-2">
                                        <Button
                                          size="sm"
                                          onClick={() => saveDescription(section.id)}
                                          isLoading={updateSectionDescription.isPending}
                                          leftIcon={<Check className="h-3.5 w-3.5" />}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelEditing}
                                          leftIcon={<X className="h-3.5 w-3.5" />}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500 mt-1">
                                      {section.description || 'No description'}
                                    </p>
                                  )}
                                </div>

                                {editingSection !== section.id && (
                                  <button
                                    onClick={() => startEditing(section.id, section.description || '')}
                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                    title="Edit description"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))
          )}
        </div>

        {/* Info box */}
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Editing a section description here will update it globally.
            When you select this template for a new document, the updated description will be used
            for AI content generation.
          </p>
        </Card>
      </div>
    </Layout>
  )
}
