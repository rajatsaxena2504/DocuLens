import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Plus,
  Sparkles,
  FileCode,
  FolderTree,
  Code,
  CheckCircle,
  ArrowLeft,
  RotateCcw,
  Lightbulb,
  GripVertical,
  Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import SectionPlanItem from '@/components/sections/SectionPlanItem'
import AddSectionModal from '@/components/sections/AddSectionModal'
import Loading, { PageLoading } from '@/components/common/Loading'
import {
  useDocument,
  useSectionSuggestions,
  useAddSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  useUpdateDocument,
} from '@/hooks/useDocuments'
import { useProjectAnalysis } from '@/hooks/useProjects'
import type { DocumentSection, UpdateSectionRequest } from '@/types'
import toast from 'react-hot-toast'
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

export default function SectionReviewPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()

  const { data: document, isLoading: docLoading, refetch: refetchDocument } = useDocument(documentId || '')
  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useSectionSuggestions(
    documentId || '',
    !!document && document.sections.length === 0
  )
  const { data: projectAnalysis, isLoading: analysisLoading } = useProjectAnalysis(
    document?.project_id || '',
    !!document
  )

  const addSection = useAddSection()
  const updateSection = useUpdateSection()
  const deleteSection = useDeleteSection()
  const reorderSections = useReorderSections()
  const updateDocument = useUpdateDocument()

  const [sections, setSections] = useState<DocumentSection[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (document?.sections && document.sections.length > 0) {
      setSections(document.sections)
    }
  }, [document])

  useEffect(() => {
    if (suggestions && document && document.sections.length === 0) {
      const addSuggestions = async () => {
        for (let index = 0; index < suggestions.length; index++) {
          const suggestion = suggestions[index]
          if (suggestion.section_id) {
            await addSection.mutateAsync({
              documentId: document.id,
              data: {
                section_id: suggestion.section_id,
                display_order: index + 1,
              },
            })
          }
        }
        refetchDocument()
      }
      addSuggestions()
    }
  }, [suggestions, document])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !documentId) return

    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)

    const newSections = arrayMove(sections, oldIndex, newIndex)
    setSections(newSections)

    reorderSections.mutate({
      documentId,
      data: {
        section_orders: newSections.map((s, i) => ({ id: s.id, display_order: i + 1 })),
      },
    })
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!documentId) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return

    const newSections = arrayMove(sections, index, newIndex)
    setSections(newSections)

    reorderSections.mutate({
      documentId,
      data: {
        section_orders: newSections.map((s, i) => ({ id: s.id, display_order: i + 1 })),
      },
    })
  }

  const handleUpdateSection = (sectionId: string, updates: UpdateSectionRequest) => {
    if (!documentId) return

    updateSection.mutate({
      documentId,
      sectionId,
      data: updates,
    })

    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    )
  }

  const handleAddSection = (data: {
    section_id?: string
    custom_title?: string
    custom_description?: string
  }) => {
    if (!documentId) return

    addSection.mutate(
      {
        documentId,
        data: { ...data, display_order: sections.length + 1 },
      },
      {
        onSuccess: () => {
          refetchDocument()
          setShowAddModal(false)
        },
      }
    )
  }

  const handleRemoveSection = (sectionId: string) => {
    if (!documentId) return
    deleteSection.mutate({ documentId, sectionId })
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
  }

  const handleApproveAndGenerate = async () => {
    if (!documentId) return

    const includedSections = sections.filter(s => s.is_included)
    if (includedSections.length === 0) {
      toast.error('Please select at least one section to generate')
      return
    }

    setIsSubmitting(true)

    try {
      await updateDocument.mutateAsync({
        id: documentId,
        data: { status: 'sections_approved' },
      })

      toast.success('Sections approved! Starting generation...')
      navigate(`/documents/${documentId}/edit`)
    } catch (error) {
      toast.error('Failed to approve sections')
      setIsSubmitting(false)
    }
  }

  const handleRefreshSuggestions = () => {
    refetchSuggestions()
  }

  if (docLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <PageLoading />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card variant="elevated" className="max-w-md mx-auto text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
            <FileCode className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Document not found</h2>
          <p className="text-slate-500 mb-6">The document you're looking for doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    )
  }

  const includedCount = sections.filter((s) => s.is_included).length
  const totalCount = sections.length
  const isAnalyzing = suggestionsLoading || analysisLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <Link
            to={`/projects/${document.project_id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
                <p className="text-slate-500">Review and customize sections before generating</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analysis Stats */}
        {projectAnalysis?.analysis_data && (
          <motion.div variants={itemVariants} className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<FolderTree className="h-5 w-5" />}
              label="Files Analyzed"
              value={projectAnalysis.analysis_data.structure?.total_files || 0}
              color="primary"
            />
            <StatCard
              icon={<Code className="h-5 w-5" />}
              label="Primary Language"
              value={projectAnalysis.analysis_data.primary_language || 'Unknown'}
              color="accent"
            />
            <StatCard
              icon={<FileCode className="h-5 w-5" />}
              label="Lines of Code"
              value={projectAnalysis.analysis_data.structure?.total_lines?.toLocaleString() || 0}
              color="success"
            />
          </motion.div>
        )}

        {/* Section List Card */}
        <motion.div variants={itemVariants}>
          <Card variant="elevated" padding="none" className="overflow-hidden">
            {isAnalyzing ? (
              <div className="py-16 text-center">
                <Loading size="lg" />
                <p className="mt-6 font-semibold text-slate-900">Analyzing your codebase...</p>
                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                  AI is identifying the most relevant sections for your documentation based on your project structure
                </p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
                      includedCount > 0
                        ? 'bg-success-100 text-success-700'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      <CheckCircle className="h-4 w-4" />
                      {includedCount} of {totalCount} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshSuggestions}
                      disabled={suggestionsLoading}
                      leftIcon={<RotateCcw className={cn(
                        'h-4 w-4',
                        suggestionsLoading && 'animate-spin'
                      )} />}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddModal(true)}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Add Section
                    </Button>
                  </div>
                </div>

                {/* Section Plan List */}
                <div className="p-6">
                  {sections.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <FileCode className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="font-semibold text-slate-900">No sections yet</p>
                      <p className="mt-1 text-sm text-slate-500">Add your first section to get started</p>
                      <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => setShowAddModal(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Add Your First Section
                      </Button>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sections.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          <AnimatePresence>
                            {sections.map((section, index) => (
                              <SectionPlanItem
                                key={section.id}
                                section={section}
                                index={index}
                                totalCount={sections.length}
                                onUpdate={(updates) => handleUpdateSection(section.id, updates)}
                                onRemove={() => handleRemoveSection(section.id)}
                                onMoveUp={() => handleMoveSection(index, 'up')}
                                onMoveDown={() => handleMoveSection(index, 'down')}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {/* Approve & Generate Button */}
                {sections.length > 0 && (
                  <div className="border-t border-slate-100 px-6 py-6 bg-gradient-to-r from-slate-50 to-white">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleApproveAndGenerate}
                      isLoading={isSubmitting}
                      disabled={includedCount === 0 || isSubmitting}
                      leftIcon={<Sparkles className="h-5 w-5" />}
                    >
                      View & Edit Documentation
                    </Button>
                    <p className="mt-3 text-center text-xs text-slate-500">
                      AI will generate content for {includedCount} selected section{includedCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>

        {/* Tips */}
        <motion.div variants={itemVariants} className="mt-6">
          <Card variant="ghost" className="bg-gradient-to-r from-primary-50/50 to-accent-50/50 border border-primary-100">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-md shadow-primary-500/20">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Tips for better documentation</h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                    Click on a section title to edit it inline
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                    Expand sections to edit their descriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                    <GripVertical className="h-3 w-3 text-slate-400 inline" />
                    Drag sections or use arrows to reorder
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                    Uncheck sections you don't need in the final doc
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSection}
        existingSectionIds={sections.map((s) => s.section_id || '').filter(Boolean)}
      />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: 'primary' | 'accent' | 'success'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-primary-50',
      text: 'text-primary-600',
      gradient: 'from-primary-500 to-primary-600',
    },
    accent: {
      bg: 'bg-accent-50',
      text: 'text-accent-600',
      gradient: 'from-accent-500 to-accent-600',
    },
    success: {
      bg: 'bg-success-50',
      text: 'text-success-600',
      gradient: 'from-success-500 to-success-600',
    },
  }

  const colors = colorClasses[color]

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            colors.bg
          )}>
            <div className={colors.text}>{icon}</div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
        </div>
        <div className={cn(
          'absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-10',
          `bg-gradient-to-br ${colors.gradient}`
        )} />
      </Card>
    </motion.div>
  )
}
