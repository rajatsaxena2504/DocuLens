import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/utils/helpers'

interface SectionProgress {
  id: string
  title: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  error?: string
}

interface GenerationProgressBarProps {
  isVisible: boolean
  sections: SectionProgress[]
  completedCount: number
  totalCount: number
}

export default function GenerationProgressBar({
  isVisible,
  sections,
  completedCount,
  totalCount,
}: GenerationProgressBarProps) {
  if (!isVisible) return null

  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const currentSection = sections.find(s => s.status === 'generating')
  const errorCount = sections.filter(s => s.status === 'error').length
  const isComplete = completedCount + errorCount === totalCount && totalCount > 0

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      {/* Progress info row */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isComplete ? (
            <>
              <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />
              <span className="text-sm font-medium text-slate-700">
                Generating: <span className="text-primary-600">{currentSection?.title || '...'}</span>
              </span>
            </>
          ) : (
            <>
              {errorCount > 0 ? (
                <XCircle className="h-4 w-4 text-danger-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success-500" />
              )}
              <span className="text-sm font-medium text-slate-700">
                {errorCount > 0
                  ? `Completed with ${errorCount} error(s)`
                  : 'All sections generated'
                }
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Section status indicators */}
          <div className="hidden sm:flex items-center gap-1">
            {sections.map((section) => (
              <div
                key={section.id}
                title={section.title}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  section.status === 'pending' && 'bg-slate-300',
                  section.status === 'generating' && 'bg-primary-500 animate-pulse',
                  section.status === 'completed' && 'bg-success-500',
                  section.status === 'error' && 'bg-danger-500'
                )}
              />
            ))}
          </div>

          <span className="text-xs font-medium text-slate-500">
            {completedCount}/{totalCount} sections
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <motion.div
          className={cn(
            "h-full",
            isComplete && errorCount === 0
              ? "bg-success-500"
              : isComplete && errorCount > 0
              ? "bg-warning-500"
              : "bg-primary-500"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
