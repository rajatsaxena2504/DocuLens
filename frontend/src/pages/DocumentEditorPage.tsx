import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  RefreshCw,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  FileText,
  ArrowLeft,
  ListTree,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
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
// DocumentSection type is inferred from the hook
import toast from 'react-hot-toast'
import { useSession } from '@/context/SessionContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
}

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
  const [showTOC] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false)

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (document?.sections && document.sections.length > 0 && !selectedSectionId) {
      const firstIncluded = document.sections.find((s) => s.is_included)
      if (firstIncluded) {
        setSelectedSectionId(firstIncluded.id)
        setEditedContent(firstIncluded.content || '')
        setExpandedSections(new Set(document.sections.map(s => s.id)))
      }
    }
  }, [document, selectedSectionId])

  useEffect(() => {
    if (documentId && document) {
      updateSessionDoc(documentId, { status: 'editing' })
    }
  }, [documentId, document])

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
    setTimeout(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  if (isLoading) {
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
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Document not found</h2>
          <p className="text-slate-500 mb-6">The document you're looking for doesn't exist or was deleted.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    )
  }

  const includedSections = document.sections.filter((s) => s.is_included)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Document Sidebar */}
      <DocumentSidebar />

      {/* Main content area */}
      <div className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/projects/${document.project_id}`}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-md shadow-primary-500/20">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">{document.title}</h1>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    getStatusColor(document.status)
                  )}>
                    {getStatusLabel(document.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AnimatePresence>
                {hasChanges && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Button
                      onClick={handleSave}
                      isLoading={updateContent.isPending}
                      leftIcon={<Save className="h-4 w-4" />}
                    >
                      Save Changes
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <ExportOptions documentId={document.id} documentTitle={document.title} />
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Table of Contents Sidebar */}
          <AnimatePresence>
            {showTOC && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 288, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="sticky top-[73px] h-[calc(100vh-73px)] flex-shrink-0 overflow-hidden border-r border-slate-200/60 bg-white"
              >
                <div className="h-full overflow-y-auto p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                        <ListTree className="h-4 w-4 text-slate-600" />
                      </div>
                      Contents
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddModal(true)}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Add
                    </Button>
                  </div>

                  <nav className="space-y-1">
                    {includedSections.map((section, index) => (
                      <motion.button
                        key={section.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all',
                          selectedSectionId === section.id
                            ? 'bg-gradient-to-r from-primary-50 to-primary-50/50 text-primary-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <span className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                          selectedSectionId === section.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        )}>
                          {index + 1}
                        </span>
                        <span className="flex-1 truncate font-medium">{section.title}</span>
                        {section.content && (
                          <CheckCircle2 className="h-4 w-4 text-success-500" />
                        )}
                      </motion.button>
                    ))}
                  </nav>

                  {includedSections.length === 0 && (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <FileText className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">No sections</p>
                      <p className="mt-1 text-xs text-slate-400">Add your first section</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowAddModal(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                      >
                        Add Section
                      </Button>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content - All Sections */}
          <main className="flex-1 p-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 max-w-4xl mx-auto"
            >
              {includedSections.map((section, index) => (
                <motion.div
                  key={section.id}
                  variants={itemVariants}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                >
                  <Card
                    variant="elevated"
                    padding="none"
                    className={cn(
                      'overflow-hidden transition-all duration-200',
                      selectedSectionId === section.id
                        ? 'ring-2 ring-primary-300 shadow-lg shadow-primary-500/5'
                        : 'hover:shadow-md'
                    )}
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => {
                        setSelectedSectionId(section.id)
                        toggleSection(section.id)
                      }}
                      className={cn(
                        'flex cursor-pointer items-center gap-4 border-b px-6 py-4 transition-colors',
                        selectedSectionId === section.id
                          ? 'bg-gradient-to-r from-primary-50/50 to-white border-primary-100'
                          : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                      )}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSection(section.id)
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: expandedSections.has(section.id) ? 0 : -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </motion.div>
                      </button>

                      <span className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                        selectedSectionId === section.id
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm'
                          : 'bg-slate-200 text-slate-600'
                      )}>
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h2 className={cn(
                          'font-semibold transition-colors',
                          selectedSectionId === section.id
                            ? 'text-primary-900'
                            : 'text-slate-900'
                        )}>
                          {section.title}
                        </h2>
                        <p className="text-sm text-slate-500 line-clamp-1">{section.description}</p>
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
                          leftIcon={regenerateSection.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        >
                          Regenerate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSection(section.id)
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Section Content */}
                    <AnimatePresence>
                      {expandedSections.has(section.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
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
                              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                                  <Sparkles className="h-7 w-7 text-slate-400" />
                                </div>
                                <p className="font-medium text-slate-600">No content generated yet</p>
                                <p className="mt-1 text-sm text-slate-400">Click below to generate AI content</p>
                                <Button
                                  className="mt-6"
                                  onClick={() => handleRegenerate(section.id)}
                                  disabled={regenerateSection.isPending}
                                  leftIcon={<Sparkles className="h-4 w-4" />}
                                >
                                  Generate Content
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}

              {/* Add Section Button at End */}
              <motion.button
                variants={itemVariants}
                onClick={() => setShowAddModal(true)}
                className={cn(
                  'flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 py-10 text-slate-500 transition-all',
                  'hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-600'
                )}
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add New Section</span>
              </motion.button>
            </motion.div>
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
