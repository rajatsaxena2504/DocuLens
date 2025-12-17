import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { documentsApi } from '@/api/documents'
import { generationApi } from '@/api/sections'
import { useSession } from '@/context/SessionContext'
import { cn } from '@/utils/helpers'

interface SectionProgress {
  id: string
  title: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  error?: string
}

export default function GenerationProgressPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { updateDocument, getDocument } = useSession()

  const [sectionProgress, setSectionProgress] = useState<SectionProgress[]>([])
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [hasErrors, setHasErrors] = useState(false)

  // Fetch document with sections
  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsApi.get(documentId!),
    enabled: !!documentId,
  })

  // Initialize section progress from document sections
  useEffect(() => {
    if (document?.sections) {
      const includedSections = document.sections.filter(s => s.is_included)
      setSectionProgress(
        includedSections.map((s, index) => ({
          id: s.id,
          title: s.title,
          status: index === 0 ? 'generating' : 'pending',
        }))
      )
    }
  }, [document])

  // Generate document mutation
  const generateMutation = useMutation({
    mutationFn: () => generationApi.generateDocument(documentId!),
    onSuccess: (result) => {
      // Update all sections to completed
      setSectionProgress(prev =>
        prev.map(s => ({
          ...s,
          status: 'completed' as const,
        }))
      )
      setIsComplete(true)

      // Update session
      if (documentId) {
        const sessionDoc = getDocument(documentId)
        if (sessionDoc) {
          updateDocument(documentId, { status: 'completed' })
        }
      }

      // Check if any sections used placeholder content
      const placeholderCount = result.results?.filter((r: any) => r.used_placeholder).length || 0
      if (placeholderCount > 0) {
        toast.success(
          `Documentation generated! ${placeholderCount} section(s) used placeholder content due to AI unavailability.`,
          { duration: 6000 }
        )
      } else {
        toast.success('Documentation generated successfully!')
      }
    },
    onError: (error: Error) => {
      setHasErrors(true)
      toast.error(error.message || 'Failed to generate documentation')
    },
  })

  // Start generation when page loads
  useEffect(() => {
    if (document && sectionProgress.length > 0 && !generateMutation.isPending && !isComplete && !hasErrors) {
      generateMutation.mutate()
    }
  }, [document, sectionProgress.length])

  // Simulate progress updates (since we don't have real-time updates yet)
  useEffect(() => {
    if (!generateMutation.isPending || sectionProgress.length === 0) return

    const interval = setInterval(() => {
      setCurrentSectionIndex(prev => {
        const next = prev + 1
        if (next >= sectionProgress.length) {
          clearInterval(interval)
          return prev
        }

        // Update section statuses
        setSectionProgress(sections =>
          sections.map((s, idx) => ({
            ...s,
            status: idx < next ? 'completed' : idx === next ? 'generating' : 'pending',
          }))
        )

        return next
      })
    }, 2000) // Simulate 2 seconds per section

    return () => clearInterval(interval)
  }, [generateMutation.isPending, sectionProgress.length])

  const handleViewDocument = () => {
    navigate(`/documents/${documentId}/edit`)
  }

  const handleRetry = () => {
    setHasErrors(false)
    setIsComplete(false)
    setCurrentSectionIndex(0)
    setSectionProgress(prev =>
      prev.map((s, idx) => ({
        ...s,
        status: idx === 0 ? 'generating' : 'pending',
        error: undefined,
      }))
    )
    generateMutation.mutate()
  }

  if (documentLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
            <p className="mt-2 text-gray-600">Loading document...</p>
          </div>
        </div>
      </Layout>
    )
  }

  const completedCount = sectionProgress.filter(s => s.status === 'completed').length
  const totalCount = sectionProgress.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-primary-100 p-4">
            {isComplete ? (
              <CheckCircle className="h-12 w-12 text-green-600" />
            ) : hasErrors ? (
              <XCircle className="h-12 w-12 text-red-600" />
            ) : (
              <Sparkles className="h-12 w-12 animate-pulse text-primary-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isComplete
              ? 'Documentation Complete!'
              : hasErrors
                ? 'Generation Error'
                : 'Generating Documentation'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isComplete
              ? 'Your documentation is ready to view and edit'
              : hasErrors
                ? 'There was an error generating your documentation'
                : 'AI is analyzing your code and generating content...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isComplete ? 'bg-green-500' : hasErrors ? 'bg-red-500' : 'bg-primary-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-gray-500">
            {completedCount} of {totalCount} sections generated
          </p>
        </div>

        {/* Section Progress List */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <FileText className="h-5 w-5" />
            Section Progress
          </h2>
          <div className="space-y-3">
            {sectionProgress.map((section, index) => (
              <SectionProgressItem
                key={section.id}
                section={section}
                isActive={index === currentSectionIndex && !isComplete && !hasErrors}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {isComplete && (
            <Button onClick={handleViewDocument} size="lg">
              View & Edit Document
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
          {hasErrors && (
            <>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Go Back
              </Button>
              <Button onClick={handleRetry}>
                Retry Generation
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

interface SectionProgressItemProps {
  section: SectionProgress
  isActive: boolean
}

function SectionProgressItem({ section, isActive }: SectionProgressItemProps) {
  const statusIcons = {
    pending: <Clock className="h-5 w-5 text-gray-400" />,
    generating: <Loader2 className="h-5 w-5 animate-spin text-primary-600" />,
    completed: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-3 transition-all',
        isActive
          ? 'bg-primary-50 ring-1 ring-primary-200'
          : section.status === 'completed'
            ? 'bg-green-50'
            : section.status === 'error'
              ? 'bg-red-50'
              : 'bg-gray-50'
      )}
    >
      {statusIcons[section.status]}
      <div className="flex-1">
        <p className={cn(
          'font-medium',
          section.status === 'completed' ? 'text-green-900' : 'text-gray-900'
        )}>
          {section.title}
        </p>
        {section.status === 'generating' && (
          <p className="text-sm text-primary-600">Generating content...</p>
        )}
        {section.error && (
          <p className="text-sm text-red-600">{section.error}</p>
        )}
      </div>
      {section.status === 'generating' && (
        <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
          In Progress
        </span>
      )}
    </div>
  )
}
