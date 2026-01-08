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
  Plus,
  Star,
  Trash2,
  Building2,
  Globe,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { Card } from '@/components/common/Card'
import Button from '@/components/common/Button'
import ConfirmModal from '@/components/common/ConfirmModal'
import {
  useTemplatesLibrary,
  useUpdateSectionDescription,
  useCreateTemplate,
  useSetTemplateDefault,
  useDeleteTemplate,
  useSectionsLibrary,
  useAddSectionToTemplate,
  useRemoveSectionFromTemplate,
} from '@/hooks/useSections'
import { useOrganization } from '@/context/OrganizationContext'
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

type ScopeFilter = 'all' | 'system' | 'org'

export default function TemplateLibraryPage() {
  const { currentOrg, isOwner } = useOrganization()
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const { data: templates, isLoading, refetch } = useTemplatesLibrary(
    scopeFilter === 'all' ? undefined : scopeFilter,
    currentOrg?.id
  )
  const { data: allSections } = useSectionsLibrary()
  const updateSectionDescription = useUpdateSectionDescription()
  const createTemplate = useCreateTemplate()
  const setTemplateDefault = useSetTemplateDefault()
  const deleteTemplate = useDeleteTemplate()
  const addSectionToTemplate = useAddSectionToTemplate()
  const removeSectionFromTemplate = useRemoveSectionFromTemplate()

  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editedDescription, setEditedDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  // Create template form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')

  // Add section state
  const [addingSectionToTemplate, setAddingSectionToTemplate] = useState<string | null>(null)
  const [selectedSectionToAdd, setSelectedSectionToAdd] = useState<string>('')

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'deleteTemplate' | 'removeSection' | null
    templateId: string
    templateName: string
    sectionId?: string
    sectionName?: string
  }>({
    isOpen: false,
    type: null,
    templateId: '',
    templateName: '',
  })

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

  // Get available sections for adding (not already in template)
  const getAvailableSections = (templateSections: Array<{ id: string }> | undefined) => {
    if (!allSections) return []
    const existingIds = new Set(templateSections?.map(s => s.id) || [])
    return allSections.filter(s => !existingIds.has(s.id))
  }

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

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('Template name is required')
      return
    }

    createTemplate.mutate(
      {
        data: { name: newTemplateName, description: newTemplateDescription },
        organizationId: currentOrg?.id,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false)
          setNewTemplateName('')
          setNewTemplateDescription('')
          refetch()
        },
      }
    )
  }

  const handleSetDefault = (templateId: string) => {
    setTemplateDefault.mutate(templateId)
  }

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'deleteTemplate',
      templateId,
      templateName,
    })
  }

  const confirmDeleteTemplate = () => {
    deleteTemplate.mutate(confirmModal.templateId, {
      onSuccess: () => {
        setConfirmModal({ isOpen: false, type: null, templateId: '', templateName: '' })
      },
    })
  }

  const handleAddSection = (templateId: string) => {
    if (!selectedSectionToAdd) {
      toast.error('Please select a section')
      return
    }

    addSectionToTemplate.mutate(
      { templateId, sectionId: selectedSectionToAdd },
      {
        onSuccess: () => {
          setAddingSectionToTemplate(null)
          setSelectedSectionToAdd('')
          refetch()
        },
      }
    )
  }

  const handleRemoveSection = (templateId: string, sectionId: string, sectionName: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'removeSection',
      templateId,
      templateName: '',
      sectionId,
      sectionName,
    })
  }

  const confirmRemoveSection = () => {
    if (confirmModal.sectionId) {
      removeSectionFromTemplate.mutate(
        { templateId: confirmModal.templateId, sectionId: confirmModal.sectionId },
        {
          onSuccess: () => {
            setConfirmModal({ isOpen: false, type: null, templateId: '', templateName: '' })
            refetch()
          },
        }
      )
    }
  }

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, templateId: '', templateName: '' })
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                <Layers className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Template Library</h1>
                <p className="text-sm text-slate-500">
                  Browse and manage document templates
                </p>
              </div>
            </div>
            {isOwner && (
              <Button
                onClick={() => setShowCreateForm(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Template
              </Button>
            )}
          </div>
        </div>

        {/* Create Template Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="mb-6 p-4">
                <h3 className="font-medium text-slate-900 mb-4">Create Organization Template</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g., Technical Design Document"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      placeholder="Brief description of this template..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCreateTemplate}
                      isLoading={createTemplate.isPending}
                    >
                      Create Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewTemplateName('')
                        setNewTemplateDescription('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scope Filter Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setScopeFilter('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              scopeFilter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All Templates
          </button>
          <button
            onClick={() => setScopeFilter('system')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              scopeFilter === 'system'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            System
          </button>
          <button
            onClick={() => setScopeFilter('org')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              scopeFilter === 'org'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            Organization
          </button>
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
              All Stages
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
              {scopeFilter === 'org' && isOwner && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create your first organization template
                </Button>
              )}
            </Card>
          ) : (
            filteredTemplates.map((template) => {
              const canEditTemplate = !template.is_system && isOwner
              const availableSections = getAvailableSections(template.sections)

              return (
                <Card key={template.id} className="overflow-hidden">
                  {/* Template Header */}
                  <div className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                    <button
                      onClick={() => toggleTemplate(template.id)}
                      className="flex items-center gap-3 flex-1 text-left"
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
                          {template.is_system ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              <Globe className="h-3 w-3" />
                              System
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              <Building2 className="h-3 w-3" />
                              Org
                            </span>
                          )}
                          {template.is_org_default && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              <Star className="h-3 w-3" />
                              Default
                            </span>
                          )}
                          {template.stage && (
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium border',
                              stageColors[template.stage]
                            )}>
                              {template.stage}
                            </span>
                          )}
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

                    {/* Actions for org templates */}
                    {canEditTemplate && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetDefault(template.id)}
                          className={cn(
                            'p-1.5 rounded transition-colors',
                            template.is_org_default
                              ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                              : 'text-slate-400 hover:text-yellow-600 hover:bg-yellow-50'
                          )}
                          title={template.is_org_default ? 'Remove from defaults' : 'Set as default'}
                        >
                          <Star className={cn('h-4 w-4', template.is_org_default && 'fill-current')} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

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
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Sections in this template
                            </h4>
                            {canEditTemplate && availableSections.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddingSectionToTemplate(template.id)}
                                leftIcon={<Plus className="h-3.5 w-3.5" />}
                              >
                                Add Section
                              </Button>
                            )}
                          </div>

                          {/* Add Section Form */}
                          {addingSectionToTemplate === template.id && (
                            <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Select a section to add
                              </label>
                              <select
                                value={selectedSectionToAdd}
                                onChange={(e) => setSelectedSectionToAdd(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 mb-3"
                              >
                                <option value="">Choose a section...</option>
                                {availableSections.map((section) => (
                                  <option key={section.id} value={section.id}>
                                    {section.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddSection(template.id)}
                                  isLoading={addSectionToTemplate.isPending}
                                >
                                  Add
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setAddingSectionToTemplate(null)
                                    setSelectedSectionToAdd('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {template.sections && template.sections.length > 0 ? (
                            <div className="space-y-2">
                              {template.sections.map((section, index) => (
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

                                    <div className="flex items-center gap-1">
                                      {editingSection !== section.id && (
                                        <button
                                          onClick={() => startEditing(section.id, section.description || '')}
                                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                          title="Edit description"
                                        >
                                          <Edit3 className="h-4 w-4" />
                                        </button>
                                      )}
                                      {canEditTemplate && (
                                        <button
                                          onClick={() => handleRemoveSection(template.id, section.id, section.name)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="Remove from template"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-sm text-slate-500 mb-3">
                                No sections defined for this template
                              </p>
                              {canEditTemplate && availableSections.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingSectionToTemplate(template.id)}
                                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                                >
                                  Add your first section
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })
          )}
        </div>

        {/* Info box */}
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> {isOwner ? (
              <>Create organization templates for your team. Add sections from the library and set a template as &quot;Default&quot; to make it easily accessible when creating new documents.</>
            ) : (
              <>Editing a section description here will update it globally. When you select this template for a new document, the updated description will be used for AI content generation.</>
            )}
          </p>
        </Card>
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.type === 'deleteTemplate'}
        onClose={closeConfirmModal}
        onConfirm={confirmDeleteTemplate}
        title="Delete Template"
        message={
          <>
            Are you sure you want to delete <strong>&quot;{confirmModal.templateName}&quot;</strong>?
            This action cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="danger"
        isLoading={deleteTemplate.isPending}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen && confirmModal.type === 'removeSection'}
        onClose={closeConfirmModal}
        onConfirm={confirmRemoveSection}
        title="Remove Section"
        message={
          <>
            Remove <strong>&quot;{confirmModal.sectionName}&quot;</strong> from this template?
            The section will still be available in the library.
          </>
        }
        confirmText="Remove"
        variant="warning"
        isLoading={removeSectionFromTemplate.isPending}
      />
    </Layout>
  )
}
