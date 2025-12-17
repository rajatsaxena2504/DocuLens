import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  ArrowLeft,
  Download,
  ListTree,
} from 'lucide-react'
import Button from '@/components/common/Button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import ExportOptions from '@/components/editor/ExportOptions'
import DocumentSidebar from '@/components/layout/DocumentSidebar'
import AddSectionModal from '@/components/sections/AddSectionModal'
import { PageLoading } from '@/components/common/Loading'
import {
  useDocument,
  useRegenerateSection,
  useUpdateSectionContent,
  useAddSection,
  useDeleteSection,
  useGenerateDocument,
} from '@/hooks/useDocuments'
import { cn, getStatusColor, getStatusLabel } from '@/utils/helpers'
import type { DocumentSection } from '@/types'
import toast from 'react-hot-toast'
import { useSession } from '@/context/SessionContext'

export default function DocumentEditorPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { updateDocument: updateSessionDoc } = useSession()

  const { data: document, isLoading, refetch } = useDocument(documentId || '')
  const regenerateSection = useRegenerateSection()
  const updateContent = useUpdateSectionContent()
  const addSection = useAddSection()
  const deleteSection = useDeleteSection()
  const generateDocument = useGenerateDocument()

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const [showTOC, setShowTOC] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false)

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Set initial selection
  useEffect(() => {
    if (document?.sections && document.sections.length > 0 && !selectedSectionId) {
      const firstIncluded = document.sections.find((s) => s.is_included)
      if (firstIncluded) {
        setSelectedSectionId(firstIncluded.id)
        setEditedContent(firstIncluded.content || '')
        // Expand all sections by default
        setExpandedSections(new Set(document.sections.map(s => s.id)))
      }
    }
  }, [document, selectedSectionId])

  // Update session document status
  useEffect(() => {
    if (documentId && document) {
      updateSessionDoc(documentId, { status: 'editing' })
    }
  }, [documentId, document])

  // Auto-generate content if sections are empty
  useEffect(() => {
    if (
      document &&
      documentId &&
      !autoGenerateTriggered &&
      !isAutoGenerating &&
      !generateDocument.isPending
    ) {
      const includedSections = document.sections.filter(s => s.is_included)
      const sectionsNeedingContent = includedSections.filter(s => !s.content)

      if (includedSections.length > 0 && sectionsNeedingContent.length === includedSections.length) {
        // All sections need content - trigger full generation
        setIsAutoGenerating(true)
        setAutoGenerateTriggered(true)
        toast.loading('Generating documentation content...', { id: 'auto-generate' })

        generateDocument.mutate(documentId, {
          onSuccess: (result) => {
            const placeholderCount = result.results?.filter((r: any) => r.used_placeholder).length || 0
            if (placeholderCount > 0) {
              toast.success(
                `Content generated! ${placeholderCount} section(s) used placeholder content - AI was unavailable.`,
                { id: 'auto-generate', duration: 6000 }
              )
            } else {
              toast.success('Content generated!', { id: 'auto-generate' })
            }
            setIsAutoGenerating(false)
            refetch()
          },
          onError: () => {
            toast.error('Failed to generate content', { id: 'auto-generate' })
            setIsAutoGenerating(false)
          },
        })
      }
    }
  }, [document, documentId, autoGenerateTriggered, isAutoGenerating])

  const selectedSection = document?.sections.find(s => s.id === selectedSectionId)

  // Update content when selection changes
  useEffect(() => {
    if (selectedSection) {
      setEditedContent(selectedSection.content || '')
      setHasChanges(false)
    }
  }, [selectedSectionId])

  const handleContentChange = (content: string) => {
    setEditedContent(content)
    setHasChanges(content !== selectedSection?.content)
  }

  const handleSave = () => {
    if (!documentId || !selectedSectionId) return

    updateContent.mutate(
      { documentId, sectionId: selectedSectionId, content: editedContent },
      {
        onSuccess: () => {
          setHasChanges(false)
          toast.success('Content saved')
          refetch()
        },
      }
    )
  }

  const handleRegenerate = (sectionId: string) => {
    if (!documentId) return

    regenerateSection.mutate(
      { documentId, sectionId },
      {
        onSuccess: (result) => {
          if (sectionId === selectedSectionId) {
            setEditedContent(result.content)
            setHasChanges(false)
          }
          toast.success('Section regenerated')
          refetch()
        },
      }
    )
  }

  const handleAddSection = (data: {
    section_id?: string
    custom_title?: string
    custom_description?: string
  }) => {
    if (!documentId || !document) return

    addSection.mutate(
      {
        documentId,
        data: { ...data, display_order: document.sections.length + 1 },
      },
      {
        onSuccess: () => {
          refetch()
          setShowAddModal(false)
          toast.success('Section added')
        },
      }
    )
  }

  const handleRemoveSection = (sectionId: string) => {
    if (!documentId) return

    if (confirm('Are you sure you want to remove this section?')) {
      deleteSection.mutate(
        { documentId, sectionId },
        {
          onSuccess: () => {
            if (selectedSectionId === sectionId) {
              setSelectedSectionId(null)
            }
            refetch()
            toast.success('Section removed')
          },
        }
      )
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const scrollToSection = (sectionId: string) => {
    setSelectedSectionId(sectionId)
    if (!expandedSections.has(sectionId)) {
      setExpandedSections(prev => new Set([...prev, sectionId]))
    }
    // Small delay to allow expansion
    setTimeout(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  if (isLoading || isAutoGenerating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 font-medium text-gray-900">
            {isAutoGenerating ? 'Generating documentation content...' : 'Loading document...'}
          </p>
          {isAutoGenerating && (
            <p className="mt-1 text-sm text-gray-500">
              AI is analyzing your code and creating content for each section
            </p>
          )}
        </div>
      </div>
    )
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

  const includedSections = document.sections.filter((s) => s.is_included)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Document Sidebar for multi-document */}
      <DocumentSidebar />

      {/* Main content area with left margin for sidebar */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{document.title}</h1>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(document.status)}`}>
                  {getStatusLabel(document.status)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <Button onClick={handleSave} isLoading={updateContent.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              )}
              <ExportOptions documentId={document.id} documentTitle={document.title} />
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Table of Contents Sidebar */}
          {showTOC && (
            <aside className="sticky top-[73px] h-[calc(100vh-73px)] w-72 flex-shrink-0 overflow-y-auto border-r bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                  <ListTree className="h-4 w-4" />
                  Table of Contents
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <nav className="space-y-1">
                {includedSections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selectedSectionId === section.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded text-xs font-medium',
                      selectedSectionId === section.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate">{section.title}</span>
                    {section.content && (
                      <span className="h-2 w-2 rounded-full bg-green-400" title="Has content" />
                    )}
                  </button>
                ))}
              </nav>

              {includedSections.length === 0 && (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No sections</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Section
                  </Button>
                </div>
              )}
            </aside>
          )}

          {/* Main Content - All Sections */}
          <main className={cn(
            'flex-1 p-6',
            !showTOC && 'max-w-4xl mx-auto'
          )}>
            <div className="space-y-6">
              {includedSections.map((section, index) => (
                <div
                  key={section.id}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                  className={cn(
                    'rounded-xl border bg-white transition-shadow',
                    selectedSectionId === section.id
                      ? 'ring-2 ring-primary-300 shadow-md'
                      : 'shadow-sm'
                  )}
                >
                  {/* Section Header */}
                  <div
                    onClick={() => {
                      setSelectedSectionId(section.id)
                      toggleSection(section.id)
                    }}
                    className="flex cursor-pointer items-center gap-3 border-b bg-gray-50 px-6 py-4 rounded-t-xl"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSection(section.id)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-sm font-semibold text-primary-700">
                      H{index < 3 ? 1 : index < 6 ? 2 : 3}
                    </span>

                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900">{section.title}</h2>
                      <p className="text-sm text-gray-500 line-clamp-1">{section.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRegenerate(section.id)
                        }}
                        disabled={regenerateSection.isPending}
                      >
                        {regenerateSection.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveSection(section.id)
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Section Content */}
                  {expandedSections.has(section.id) && (
                    <div className="p-6">
                      {section.content ? (
                        <div onClick={() => setSelectedSectionId(section.id)}>
                          <RichTextEditor
                            content={selectedSectionId === section.id ? editedContent : section.content}
                            onChange={selectedSectionId === section.id ? handleContentChange : () => {}}
                            editable={selectedSectionId === section.id}
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                          <p className="text-gray-500">No content generated yet</p>
                          <Button
                            className="mt-4"
                            size="sm"
                            onClick={() => handleRegenerate(section.id)}
                            disabled={regenerateSection.isPending}
                          >
                            Generate Content
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add Section Button at End */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-8 text-gray-500 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                <Plus className="h-5 w-5" />
                Add New Section
              </button>
            </div>
          </main>
        </div>
      </div>

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSection}
        existingSectionIds={document.sections.map((s) => s.section_id || '').filter(Boolean)}
      />
    </div>
  )
}
