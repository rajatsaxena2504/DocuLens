import { useState, useEffect, useRef, useCallback } from 'react'
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
  Wand2,
  History,
  FileEdit,
  Send,
  Lock,
  Unlock,
  MessageSquare,
  Undo2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import RichTextEditor from '@/components/editor/RichTextEditor'
import ExportOptions from '@/components/editor/ExportOptions'
import AddSectionModal from '@/components/sections/AddSectionModal'
import GenerationProgressBar from '@/components/editor/GenerationProgressBar'
import SectionPromptEditor from '@/components/editor/SectionPromptEditor'
import VersionPanel from '@/components/editor/VersionPanel'
import VersionComparisonModal from '@/components/editor/VersionComparisonModal'
import SubmitForReviewModal from '@/components/editor/SubmitForReviewModal'
import { PageLoading } from '@/components/common/Loading'
import {
  useDocument,
  useRegenerateSection,
  useUpdateSectionContent,
  useAddSection,
  useDeleteSection,
} from '@/hooks/useDocuments'
import { useReviewStatus, useDocumentReviews, useRecallToDraft, useWithdrawFromReview } from '@/hooks/useDocumentReviews'
import { generationApi } from '@/api/sections'
import { useSDLCProject, useSDLCStage } from '@/hooks/useSDLCProjects'
import { useProjectContext } from '@/context/ProjectContext'
import { useOrganization } from '@/context/OrganizationContext'
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
  const { setCurrentProject, setCurrentStage, setBreadcrumbItems } = useProjectContext()
  const { canEdit, canReview } = useOrganization()

  const { data: document, isLoading, refetch } = useDocument(documentId || '')
  const { data: reviewStatus, refetch: refetchReviewStatus } = useReviewStatus(documentId || '')
  const { data: reviews } = useDocumentReviews(documentId || '')
  const recallToDraft = useRecallToDraft()
  const withdrawFromReview = useWithdrawFromReview()
  const { data: sdlcProject } = useSDLCProject(document?.sdlc_project_id || '')
  const { data: stage } = useSDLCStage(document?.stage_id || '')
  const regenerateSection = useRegenerateSection()
  const updateContent = useUpdateSectionContent()
  const addSection = useAddSection()
  const deleteSection = useDeleteSection()

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const [showTOC] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false)
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [sectionProgress, setSectionProgress] = useState<Array<{
    id: string
    title: string
    status: 'pending' | 'generating' | 'completed' | 'error'
    error?: string
  }>>([])
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [showSubmitForReview, setShowSubmitForReview] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{
    from: number
    to: number
  } | null>(null)

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

  // Set project context for sidebar
  useEffect(() => {
    if (sdlcProject) {
      setCurrentProject(sdlcProject)
      if (stage) {
        setCurrentStage(stage)
      }
      // Set breadcrumbs
      const crumbs: Array<{ label: string; href?: string }> = [
        { label: 'Projects', href: '/projects' },
        { label: sdlcProject.name, href: `/projects/${sdlcProject.id}` },
      ]
      if (stage) {
        crumbs.push({ label: stage.name, href: `/projects/${sdlcProject.id}/stages/${stage.id}` })
      }
      if (document) {
        crumbs.push({ label: document.title })
      }
      setBreadcrumbItems(crumbs)
    }
    return () => {
      setCurrentProject(null)
      setCurrentStage(null)
      setBreadcrumbItems([])
    }
  }, [sdlcProject, stage, document, setCurrentProject, setCurrentStage, setBreadcrumbItems])

  useEffect(() => {
    if (
      document &&
      documentId &&
      !autoGenerateTriggered &&
      !isAutoGenerating
    ) {
      const includedSections = document.sections.filter(s => s.is_included)
      const sectionsNeedingContent = includedSections.filter(s => !s.content)

      if (includedSections.length > 0 && sectionsNeedingContent.length === includedSections.length) {
        setIsAutoGenerating(true)
        setAutoGenerateTriggered(true)

        // Initialize progress tracking
        setSectionProgress(includedSections.map(s => ({
          id: s.id,
          title: s.title,
          status: 'pending' as const,
        })))
        setShowProgressModal(true)

        // Generate sections sequentially with real-time progress
        const generateSequentially = async () => {
          let placeholderCount = 0
          let errorCount = 0

          for (let i = 0; i < includedSections.length; i++) {
            const section = includedSections[i]

            // Mark current section as generating
            setSectionProgress(prev => prev.map((p, idx) =>
              idx === i ? { ...p, status: 'generating' as const } : p
            ))

            try {
              const result = await generationApi.regenerateSection(documentId, section.id)

              // Mark section as completed
              setSectionProgress(prev => prev.map((p, idx) =>
                idx === i ? { ...p, status: 'completed' as const } : p
              ))

              if (result.used_placeholder) {
                placeholderCount++
              }
            } catch (err) {
              // Mark section as error
              setSectionProgress(prev => prev.map((p, idx) =>
                idx === i ? { ...p, status: 'error' as const, error: 'Generation failed' } : p
              ))
              errorCount++
            }
          }

          // Generation complete
          setTimeout(() => {
            setShowProgressModal(false)
            setIsAutoGenerating(false)

            if (errorCount > 0) {
              toast.error(`${errorCount} section(s) failed to generate`)
            } else if (placeholderCount > 0) {
              toast.success(
                `Content generated! ${placeholderCount} section(s) used placeholder content - AI was unavailable.`,
                { duration: 6000 }
              )
            } else {
              toast.success('All sections generated successfully!')
            }
            refetch()
          }, 800)
        }

        generateSequentially()
      }
    }
  }, [document, documentId, autoGenerateTriggered, isAutoGenerating, refetch])

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

  const handleRegenerate = useCallback((sectionId: string, customPrompt?: string) => {
    if (!documentId) return

    setRegeneratingSectionId(sectionId)
    regenerateSection.mutate(
      { documentId, sectionId, customPrompt },
      {
        onSuccess: (result) => {
          if (sectionId === selectedSectionId) {
            setEditedContent(result.content)
            setHasChanges(false)
          }
          const usedPlaceholder = result.used_placeholder
          if (usedPlaceholder) {
            toast.success('Section regenerated with placeholder content - AI was unavailable', { duration: 5000 })
          } else {
            toast.success('Section regenerated')
          }
          setRegeneratingSectionId(null)
          refetch()
        },
        onError: () => {
          setRegeneratingSectionId(null)
        },
      }
    )
  }, [documentId, regenerateSection, selectedSectionId, refetch])

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

  const handleGenerateAll = useCallback(async () => {
    if (!documentId || !document) return

    const sectionsToGenerate = document.sections.filter(s => s.is_included)
    if (sectionsToGenerate.length === 0) {
      toast.error('No sections to generate')
      return
    }

    // Initialize progress tracking
    setSectionProgress(sectionsToGenerate.map(s => ({
      id: s.id,
      title: s.title,
      status: 'pending' as const,
    })))
    setShowProgressModal(true)
    setIsGeneratingAll(true)

    let placeholderCount = 0
    let errorCount = 0

    // Generate sections one by one for real-time progress
    for (let i = 0; i < sectionsToGenerate.length; i++) {
      const section = sectionsToGenerate[i]

      // Mark current section as generating
      setSectionProgress(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'generating' as const } : p
      ))

      try {
        const result = await generationApi.regenerateSection(documentId, section.id)

        // Mark section as completed
        setSectionProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'completed' as const } : p
        ))

        if (result.used_placeholder) {
          placeholderCount++
        }
      } catch (err) {
        // Mark section as error
        setSectionProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error' as const, error: 'Generation failed' } : p
        ))
        errorCount++
      }
    }

    // Generation complete
    setTimeout(() => {
      setShowProgressModal(false)
      setIsGeneratingAll(false)

      if (errorCount > 0) {
        toast.error(`${errorCount} section(s) failed to generate`)
      } else if (placeholderCount > 0) {
        toast.success(
          `Content generated! ${placeholderCount} section(s) used placeholder content - AI was unavailable.`,
          { duration: 6000 }
        )
      } else {
        toast.success('All sections generated successfully!')
      }
      refetch()
    }, 800)
  }, [documentId, document, refetch])

  // Calculate progress for the modal
  const completedCount = sectionProgress.filter(s => s.status === 'completed').length
  const totalCount = sectionProgress.length

  // Determine if document is locked for editing
  const isLocked = reviewStatus?.review_status === 'approved' || reviewStatus?.review_status === 'pending_review'
  const isApproved = reviewStatus?.review_status === 'approved'
  const hasChangesRequested = reviewStatus?.review_status === 'changes_requested'

  // Get latest review for feedback
  const latestReview = reviews && reviews.length > 0 ? reviews[0] : null

  // Handle recall to draft (for reviewers)
  const handleRecallToDraft = () => {
    if (!documentId) return

    recallToDraft.mutate(documentId, {
      onSuccess: () => {
        toast.success('Document recalled to draft. Editing is now enabled.')
        refetch()
        refetchReviewStatus()
      },
      onError: (error) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Failed to recall document'
        toast.error(message)
      },
    })
  }

  // Handle withdraw from review (for editor/owner)
  const handleWithdrawFromReview = () => {
    if (!documentId) return

    withdrawFromReview.mutate(documentId, {
      onSuccess: () => {
        toast.success('Document withdrawn from review. You can now edit it.')
        refetch()
        refetchReviewStatus()
      },
      onError: (error) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'Failed to withdraw from review'
        toast.error(message)
      },
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  if (!document) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <Card variant="elevated" className="max-w-md mx-auto text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Document not found</h2>
            <p className="text-slate-500 mb-6">The document you're looking for doesn't exist or was deleted.</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </Card>
        </div>
      </Layout>
    )
  }

  const includedSections = document.sections.filter((s) => s.is_included)

  return (
    <Layout>
      {/* Main content area */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link
                to={`/projects/${document.sdlc_project_id || document.project_id}`}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-900">{document.title}</h1>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      getStatusColor(document.status)
                    )}>
                      {getStatusLabel(document.status)}
                    </span>
                    {/* Draft indicator - shows when document is not in approved state */}
                    {reviewStatus && reviewStatus.review_status !== 'approved' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                        <FileEdit className="h-3 w-3" />
                        {reviewStatus.review_status === 'draft' && 'Draft'}
                        {reviewStatus.review_status === 'pending_review' && 'Pending Review'}
                        {reviewStatus.review_status === 'changes_requested' && 'Changes Requested'}
                      </span>
                    )}
                    {reviewStatus && reviewStatus.review_status === 'approved' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3 w-3" />
                        v{document.current_version}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {hasChanges && !isLocked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Button
                      size="sm"
                      onClick={handleSave}
                      isLoading={updateContent.isPending}
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                    >
                      Save
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAll}
                disabled={isGeneratingAll || isAutoGenerating || includedSections.length === 0 || isLocked}
                leftIcon={isGeneratingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
              >
                {isGeneratingAll ? 'Generating...' : 'Generate All'}
              </Button>
              {/* Submit for Review - only for editors when document is draft or changes_requested */}
              {canEdit && reviewStatus && (reviewStatus.review_status === 'draft' || reviewStatus.review_status === 'changes_requested') && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowSubmitForReview(true)}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                >
                  Submit for Review
                </Button>
              )}
              {/* Withdraw from Review - for editor/owner when document is pending_review */}
              {canEdit && reviewStatus?.review_status === 'pending_review' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleWithdrawFromReview}
                  isLoading={withdrawFromReview.isPending}
                  leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  Withdraw from Review
                </Button>
              )}
              {/* Recall to Draft - only for reviewers when document is approved */}
              {canReview && isApproved && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRecallToDraft}
                  isLoading={recallToDraft.isPending}
                  leftIcon={<Unlock className="h-3.5 w-3.5" />}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  Recall to Draft
                </Button>
              )}
              <ExportOptions documentId={document.id} documentTitle={document.title} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowVersionPanel(!showVersionPanel)}
                leftIcon={<History className="h-3.5 w-3.5" />}
                className={showVersionPanel ? 'bg-slate-100' : ''}
              >
                Versions
              </Button>
            </div>
          </div>

          {/* Generation Progress Bar */}
          <GenerationProgressBar
            isVisible={showProgressModal}
            sections={sectionProgress}
            completedCount={completedCount}
            totalCount={totalCount}
          />

          {/* Locked Status Banner */}
          {isLocked && (
            <div className={cn(
              'flex items-center gap-3 px-4 py-2 border-b',
              isApproved ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            )}>
              <Lock className={cn(
                'h-4 w-4',
                isApproved ? 'text-green-600' : 'text-amber-600'
              )} />
              <p className={cn(
                'text-sm',
                isApproved ? 'text-green-700' : 'text-amber-700'
              )}>
                {isApproved
                  ? 'This document is approved and locked. Only reviewers can recall it for editing.'
                  : 'This document is pending review. Editing is disabled until review is complete.'}
              </p>
            </div>
          )}

          {/* Reviewer Feedback Banner */}
          {hasChangesRequested && latestReview && latestReview.overall_comment && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-amber-800">Changes Requested</p>
                    {latestReview.reviewer && (
                      <span className="text-xs text-amber-600">
                        by {latestReview.reviewer.name || latestReview.reviewer.email}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-amber-700">{latestReview.overall_comment}</p>
                </div>
              </div>
            </div>
          )}
        </header>

        <div className="flex">
          {/* Table of Contents Sidebar */}
          <AnimatePresence>
            {showTOC && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="sticky top-[57px] h-[calc(100vh-57px)] flex-shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50/50"
              >
                <div className="h-full overflow-y-auto p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <ListTree className="h-4 w-4 text-slate-500" />
                      Contents
                    </h2>
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Add
                      </Button>
                    )}
                  </div>

                  <nav className="space-y-0.5">
                    {includedSections.map((section, index) => (
                      <motion.button
                        key={section.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          'group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-all',
                          selectedSectionId === section.id
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        )}
                      >
                        <span className={cn(
                          'flex h-5 w-5 items-center justify-center rounded text-xs font-medium transition-colors',
                          selectedSectionId === section.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                        )}>
                          {index + 1}
                        </span>
                        <span className="flex-1 truncate text-sm">{section.title}</span>
                        {section.content && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success-500" />
                        )}
                      </motion.button>
                    ))}
                  </nav>

                  {includedSections.length === 0 && (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">No sections</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {isLocked ? 'Document is locked' : 'Add your first section'}
                      </p>
                      {!isLocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setShowAddModal(true)}
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                        >
                          Add Section
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content - All Sections */}
          <main className="flex-1 p-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {includedSections.map((section, index) => (
                <motion.div
                  key={section.id}
                  variants={itemVariants}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                >
                  <div
                    className={cn(
                      'rounded-lg border bg-white overflow-hidden transition-all duration-200',
                      selectedSectionId === section.id
                        ? 'ring-1 ring-primary-300 border-primary-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => {
                        setSelectedSectionId(section.id)
                        toggleSection(section.id)
                      }}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 border-b px-4 py-3 transition-colors',
                        selectedSectionId === section.id
                          ? 'bg-primary-50/50 border-primary-100'
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
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      <span className={cn(
                        'flex h-6 w-6 items-center justify-center rounded text-xs font-medium',
                        selectedSectionId === section.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      )}>
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h2 className={cn(
                          'text-sm font-semibold transition-colors',
                          selectedSectionId === section.id
                            ? 'text-primary-900'
                            : 'text-slate-900'
                        )}>
                          {section.title}
                        </h2>
                        {section.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{section.description}</p>
                        )}
                      </div>

                      {!isLocked && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <SectionPromptEditor
                            sectionId={section.id}
                            title={section.title}
                            description={section.description || ''}
                            onSave={() => {}}
                            onRegenerate={handleRegenerate}
                            isRegenerating={regeneratingSectionId === section.id}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRegenerate(section.id)
                            }}
                            disabled={regeneratingSectionId === section.id || isGeneratingAll}
                            leftIcon={regeneratingSectionId === section.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
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
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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
                          <div className="p-4">
                            {section.content ? (
                              <div onClick={() => !isLocked && setSelectedSectionId(section.id)}>
                                <RichTextEditor
                                  content={selectedSectionId === section.id ? editedContent : section.content}
                                  onChange={selectedSectionId === section.id && !isLocked ? handleContentChange : () => {}}
                                  editable={selectedSectionId === section.id && !isLocked}
                                />
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                  <Sparkles className="h-4 w-4 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500">No content yet</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {isLocked ? 'Document is locked' : 'Use "Generate All" or "Regenerate" to create content'}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}

              {/* Add Section Button at End - only when not locked */}
              {!isLocked && (
                <motion.button
                  variants={itemVariants}
                  onClick={() => setShowAddModal(true)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-6 text-slate-500 transition-all',
                    'hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-600'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Add New Section</span>
                </motion.button>
              )}
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

      {/* Version Panel */}
      <VersionPanel
        documentId={document.id}
        isOpen={showVersionPanel}
        onClose={() => setShowVersionPanel(false)}
        onCompare={(from, to) => setCompareVersions({ from, to })}
      />

      {/* Version Comparison Modal */}
      {compareVersions && (
        <VersionComparisonModal
          documentId={document.id}
          fromVersion={compareVersions.from}
          toVersion={compareVersions.to}
          isOpen={true}
          onClose={() => setCompareVersions(null)}
        />
      )}

      {/* Submit for Review Modal */}
      <SubmitForReviewModal
        isOpen={showSubmitForReview}
        onClose={() => setShowSubmitForReview(false)}
        documentId={document.id}
        documentTitle={document.title}
      />

    </Layout>
  )
}
