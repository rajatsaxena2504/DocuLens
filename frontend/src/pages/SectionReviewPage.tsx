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
  Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/common/Layout'
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
import { useSDLCProject, useSDLCStage } from '@/hooks/useSDLCProjects'
import { useProjectAnalysis } from '@/hooks/useProjects'
import { useProjectContext } from '@/context/ProjectContext'
import type { DocumentSection, UpdateSectionRequest, Repository } from '@/types'
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

// Aggregate analysis data from multiple repositories
function aggregateRepositoryAnalysis(repositories: Repository[]) {
  const analyzedRepos = repositories.filter(r => r.analysis_data)

  if (analyzedRepos.length === 0) return null

  if (analyzedRepos.length === 1) {
    return analyzedRepos[0].analysis_data
  }

  // Aggregate from multiple repositories
  const aggregated = {
    primary_language: null as string | null,
    languages: {} as Record<string, number>,
    structure: {
      total_files: 0,
      total_dirs: 0,
      total_lines: 0,
    },
    repositories: analyzedRepos.map(r => ({
      name: r.name,
      type: r.repo_type,
      primary_language: r.analysis_data?.primary_language,
    })),
  }

  for (const repo of analyzedRepos) {
    const analysis = repo.analysis_data
    if (!analysis) continue

    // Aggregate languages
    if (analysis.languages) {
      for (const [lang, count] of Object.entries(analysis.languages)) {
        aggregated.languages[lang] = (aggregated.languages[lang] || 0) + (count as number)
      }
    }

    // Aggregate structure
    if (analysis.structure) {
      aggregated.structure.total_files += analysis.structure.total_files || 0
      aggregated.structure.total_dirs += analysis.structure.total_dirs || 0
      aggregated.structure.total_lines += analysis.structure.total_lines || 0
    }
  }

  // Determine primary language
  if (Object.keys(aggregated.languages).length > 0) {
    aggregated.primary_language = Object.entries(aggregated.languages)
      .sort(([, a], [, b]) => b - a)[0][0]
  }

  return aggregated
}

export default function SectionReviewPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { setCurrentProject, setCurrentStage, setBreadcrumbItems } = useProjectContext()

  const { data: document, isLoading: docLoading, refetch: refetchDocument } = useDocument(documentId || '')
  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useSectionSuggestions(
    documentId || '',
    !!document && document.sections.length === 0
  )

  // Get SDLC project to access all repositories with analysis data
  const { data: sdlcProject, isLoading: sdlcProjectLoading } = useSDLCProject(
    document?.sdlc_project_id || ''
  )

  // Get stage info if document has a stage
  const { data: stage } = useSDLCStage(document?.stage_id || '')

  // Also get single repository analysis (as fallback)
  const { data: singleRepoAnalysis, isLoading: singleRepoLoading } = useProjectAnalysis(
    document?.project_id || '',
    !!document?.project_id
  )

  // Aggregate analysis from all repositories, or use single repo analysis as fallback
  const sdlcAnalysis = sdlcProject?.repositories?.length
    ? aggregateRepositoryAnalysis(sdlcProject.repositories)
    : null
  const aggregatedAnalysis = sdlcAnalysis || singleRepoAnalysis?.analysis_data || null
  const analysisLoading = sdlcProjectLoading || singleRepoLoading

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
              <FileCode className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Document not found</h2>
            <p className="text-slate-500 mb-6">The document you're looking for doesn't exist or was deleted.</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </Card>
        </div>
      </Layout>
    )
  }

  const includedCount = sections.filter((s) => s.is_included).length
  const totalCount = sections.length
  const isAnalyzing = suggestionsLoading || analysisLoading

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-5xl"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-5">
          <Link
            to={`/projects/${document.sdlc_project_id || document.project_id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{document.title}</h1>
              <p className="text-sm text-slate-500">Review and customize sections before generating</p>
            </div>
          </div>
        </motion.div>

        {/* Analysis Stats */}
        {aggregatedAnalysis && (
          <motion.div variants={itemVariants} className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<FolderTree className="h-4 w-4" />}
              label="Files"
              value={aggregatedAnalysis.structure?.total_files || 0}
              color="primary"
            />
            <StatCard
              icon={<Code className="h-4 w-4" />}
              label="Language"
              value={aggregatedAnalysis.primary_language || 'Unknown'}
              color="accent"
            />
            <StatCard
              icon={<FileCode className="h-4 w-4" />}
              label="Lines"
              value={aggregatedAnalysis.structure?.total_lines?.toLocaleString() || 0}
              color="success"
            />
          </motion.div>
        )}

        {/* Section List Card */}
        <motion.div variants={itemVariants}>
          <Card variant="elevated" padding="none" className="overflow-hidden">
            {isAnalyzing ? (
              <div className="py-12 text-center">
                <Loading size="md" />
                <p className="mt-4 font-medium text-slate-900">Analyzing your codebase...</p>
                <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                  AI is identifying relevant sections based on your project
                </p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      includedCount > 0
                        ? 'bg-success-100 text-success-700'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      <CheckCircle className="h-3.5 w-3.5" />
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
                        'h-3.5 w-3.5',
                        suggestionsLoading && 'animate-spin'
                      )} />}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddModal(true)}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Add Section
                    </Button>
                  </div>
                </div>

                {/* Section Plan List */}
                <div className="p-4">
                  {sections.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                        <FileCode className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-900">No sections yet</p>
                      <p className="mt-1 text-sm text-slate-500">Add your first section to get started</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowAddModal(true)}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
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
                  <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
                    <Button
                      className="w-full"
                      onClick={handleApproveAndGenerate}
                      isLoading={isSubmitting}
                      disabled={includedCount === 0 || isSubmitting}
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    >
                      View & Edit Documentation
                    </Button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      AI will generate content for {includedCount} selected section{includedCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>

        {/* Tips */}
        <motion.div variants={itemVariants} className="mt-4">
          <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-1.5">Tips for better documentation</h3>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary-400" />
                    Click title to edit inline
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary-400" />
                    Expand to edit descriptions
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary-400" />
                    Drag or use arrows to reorder
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary-400" />
                    Uncheck sections to exclude
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSection}
        existingSectionIds={sections.map((s) => s.section_id || '').filter(Boolean)}
      />
    </Layout>
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
    },
    accent: {
      bg: 'bg-accent-50',
      text: 'text-accent-600',
    },
    success: {
      bg: 'bg-success-50',
      text: 'text-success-600',
    },
  }

  const colors = colorClasses[color]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          colors.bg
        )}>
          <div className={colors.text}>{icon}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-base font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
