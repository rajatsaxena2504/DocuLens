import { useEffect } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  GitCompare,
  Plus,
  Minus,
  Edit3,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { useCompareVersions } from '@/hooks/useDocumentVersions'
import { cn } from '@/utils/helpers'
import type { SectionDiff } from '@/types'

interface VersionComparisonModalProps {
  documentId: string
  fromVersion: number
  toVersion: number
  isOpen: boolean
  onClose: () => void
}

export default function VersionComparisonModal({
  documentId,
  fromVersion,
  toVersion,
  isOpen,
  onClose,
}: VersionComparisonModalProps) {
  const { data: comparison, isLoading } = useCompareVersions(
    documentId,
    fromVersion,
    toVersion
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/25"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <GitCompare className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Version Comparison
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <span className="font-medium">v{fromVersion}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">v{toVersion}</span>
                    {comparison && (
                      <span className="text-slate-400">
                        ({format(new Date(comparison.from_timestamp), 'MMM d')} →{' '}
                        {format(new Date(comparison.to_timestamp), 'MMM d')})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : comparison ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg bg-slate-50 p-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-2">
                      Summary
                    </h3>
                    <p className="text-sm text-slate-600">{comparison.summary}</p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3">
                      <StatBadge
                        icon={<Plus className="h-3 w-3" />}
                        count={
                          comparison.section_diffs.filter(
                            (d) => d.change_type === 'added'
                          ).length
                        }
                        label="Added"
                        color="success"
                      />
                      <StatBadge
                        icon={<Minus className="h-3 w-3" />}
                        count={
                          comparison.section_diffs.filter(
                            (d) => d.change_type === 'removed'
                          ).length
                        }
                        label="Removed"
                        color="error"
                      />
                      <StatBadge
                        icon={<Edit3 className="h-3 w-3" />}
                        count={
                          comparison.section_diffs.filter(
                            (d) => d.change_type === 'modified'
                          ).length
                        }
                        label="Modified"
                        color="warning"
                      />
                    </div>
                  </div>

                  {/* Section Diffs */}
                  <div className="space-y-4">
                    {comparison.section_diffs
                      .filter((d) => d.change_type !== 'unchanged')
                      .map((diff) => (
                        <SectionDiffCard key={diff.section_id} diff={diff} />
                      ))}

                    {comparison.section_diffs.every(
                      (d) => d.change_type === 'unchanged'
                    ) && (
                      <div className="text-center py-8 text-slate-500">
                        No changes between these versions
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Failed to load comparison
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

interface StatBadgeProps {
  icon: React.ReactNode
  count: number
  label: string
  color: 'success' | 'error' | 'warning'
}

function StatBadge({ icon, count, label, color }: StatBadgeProps) {
  const colorClasses = {
    success: 'bg-success-100 text-success-700',
    error: 'bg-error-100 text-error-700',
    warning: 'bg-warning-100 text-warning-700',
  }

  if (count === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        colorClasses[color]
      )}
    >
      {icon}
      {count} {label}
    </span>
  )
}

interface SectionDiffCardProps {
  diff: SectionDiff
}

function SectionDiffCard({ diff }: SectionDiffCardProps) {
  const changeTypeConfig = {
    added: {
      icon: <Plus className="h-4 w-4" />,
      label: 'Added',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      textColor: 'text-success-700',
      badgeColor: 'bg-success-100',
    },
    removed: {
      icon: <Minus className="h-4 w-4" />,
      label: 'Removed',
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
      textColor: 'text-error-700',
      badgeColor: 'bg-error-100',
    },
    modified: {
      icon: <Edit3 className="h-4 w-4" />,
      label: 'Modified',
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      textColor: 'text-warning-700',
      badgeColor: 'bg-warning-100',
    },
    unchanged: {
      icon: null,
      label: 'Unchanged',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
      badgeColor: 'bg-slate-100',
    },
  }

  const config = changeTypeConfig[diff.change_type]

  return (
    <div className={cn('rounded-lg border p-4', config.borderColor, config.bgColor)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900">{diff.section_title}</h4>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            config.badgeColor,
            config.textColor
          )}
        >
          {config.icon}
          {config.label}
        </span>
      </div>

      {diff.change_type === 'modified' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-error-200 bg-white p-3">
            <p className="text-xs font-medium text-error-600 mb-2">Before</p>
            <div
              className="prose prose-sm max-w-none text-slate-600 line-clamp-6"
              dangerouslySetInnerHTML={{
                __html: diff.old_content || '<em>No content</em>',
              }}
            />
          </div>
          <div className="rounded border border-success-200 bg-white p-3">
            <p className="text-xs font-medium text-success-600 mb-2">After</p>
            <div
              className="prose prose-sm max-w-none text-slate-600 line-clamp-6"
              dangerouslySetInnerHTML={{
                __html: diff.new_content || '<em>No content</em>',
              }}
            />
          </div>
        </div>
      )}

      {diff.change_type === 'added' && diff.new_content && (
        <div
          className="prose prose-sm max-w-none text-slate-600"
          dangerouslySetInnerHTML={{ __html: diff.new_content }}
        />
      )}

      {diff.change_type === 'removed' && diff.old_content && (
        <div
          className="prose prose-sm max-w-none text-slate-600 line-through opacity-75"
          dangerouslySetInnerHTML={{ __html: diff.old_content }}
        />
      )}
    </div>
  )
}
