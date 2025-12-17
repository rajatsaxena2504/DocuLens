import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Loader2,
  FileCode,
  FolderTree,
  Code,
  CheckCircle,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import Button from '@/components/common/Button'
import SectionPlanItem from '@/components/sections/SectionPlanItem'
import AddSectionModal from '@/components/sections/AddSectionModal'
import { PageLoading } from '@/components/common/Loading'
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
import type { DocumentSection } from '@/types'
import toast from 'react-hot-toast'
import { cn } from '@/utils/helpers'

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

  // Initialize sections from document
  useEffect(() => {
    if (document?.sections && document.sections.length > 0) {
      setSections(document.sections)
    }
  }, [document])

  // Add suggestions as sections when loaded
  useEffect(() => {
    if (suggestions && document && document.sections.length === 0) {
      // Auto-add suggested sections
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
        // Refetch document to get updated sections
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

    // Update server
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

    // Update server
    reorderSections.mutate({
      documentId,
      data: {
        section_orders: newSections.map((s, i) => ({ id: s.id, display_order: i + 1 })),
      },
    })
  }

  const handleUpdateSection = (sectionId: string, updates: Partial<DocumentSection>) => {
    if (!documentId) return

    updateSection.mutate({
      documentId,
      sectionId,
      data: updates,
    })

    // Optimistic update
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
      // Update document status
      await updateDocument.mutateAsync({
        id: documentId,
        data: { status: 'sections_approved' },
      })

      toast.success('Sections approved! Starting generation...')
      navigate(`/documents/${documentId}/generating`)
    } catch (error) {
      toast.error('Failed to approve sections')
      setIsSubmitting(false)
    }
  }

  const handleRefreshSuggestions = () => {
    refetchSuggestions()
  }

  // Loading states
  if (docLoading) {
    return <PageLoading />
  }

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Document not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const includedCount = sections.filter((s) => s.is_included).length
  const totalCount = sections.length
  const isAnalyzing = suggestionsLoading || analysisLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          <p className="mt-1 text-gray-600">
            Review and customize sections before generating documentation
          </p>
        </div>

        {/* Analysis Stats */}
        {projectAnalysis?.analysis_data && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<FolderTree className="h-5 w-5" />}
              label="Files Analyzed"
              value={projectAnalysis.analysis_data.structure?.total_files || 0}
            />
            <StatCard
              icon={<Code className="h-5 w-5" />}
              label="Primary Language"
              value={projectAnalysis.analysis_data.primary_language || 'Unknown'}
            />
            <StatCard
              icon={<FileCode className="h-5 w-5" />}
              label="Lines of Code"
              value={projectAnalysis.analysis_data.structure?.total_lines?.toLocaleString() || 0}
            />
          </div>
        )}

        {/* Section List */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          {isAnalyzing ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
              <p className="mt-4 font-medium text-gray-900">Analyzing your codebase...</p>
              <p className="mt-1 text-sm text-gray-500">
                AI is identifying the most relevant sections for your documentation
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
                    includedCount > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
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
                  >
                    <RotateCcw className={cn(
                      'mr-1 h-4 w-4',
                      suggestionsLoading && 'animate-spin'
                    )} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Section
                  </Button>
                </div>
              </div>

              {/* Section Plan List */}
              {sections.length === 0 ? (
                <div className="py-12 text-center">
                  <FileCode className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">No sections yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
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
                    <div className="space-y-2">
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
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Approve & Generate Button */}
              {sections.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleApproveAndGenerate}
                    isLoading={isSubmitting}
                    disabled={includedCount === 0 || isSubmitting}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Approve & Generate Documentation
                  </Button>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    AI will generate content for {includedCount} selected section{includedCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h3 className="font-medium text-blue-900">Tips for better documentation</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>• Click on a section title to edit it inline</li>
            <li>• Expand sections to edit their descriptions</li>
            <li>• Drag sections to reorder them</li>
            <li>• Uncheck sections you don't need</li>
          </ul>
        </div>
      </div>

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
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
