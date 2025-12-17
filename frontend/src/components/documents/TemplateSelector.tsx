import { FileText, Check } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { useTemplates, useTemplatesByStage } from '@/hooks/useSections'
import Loading from '@/components/common/Loading'
import type { DocumentType } from '@/types'

interface TemplateSelectorProps {
  selectedId: string | null
  onSelect: (template: DocumentType) => void
  stageId?: string // Optional stage filter
}

export default function TemplateSelector({ selectedId, onSelect, stageId }: TemplateSelectorProps) {
  // Use stage-filtered templates if stageId provided, otherwise all templates
  const allTemplates = useTemplates()
  const stageTemplates = useTemplatesByStage(stageId)

  const { data: templates, isLoading } = stageId ? stageTemplates : allTemplates

  if (isLoading) return <Loading className="py-6" />

  if (!templates || templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm text-slate-500">No templates available</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <button
          type="button"
          key={template.id}
          onClick={() => onSelect(template)}
          className={cn(
            'relative rounded-lg border p-3 text-left transition-all',
            selectedId === template.id
              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          {selectedId === template.id && (
            <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                selectedId === template.id ? 'bg-primary-100' : 'bg-slate-100'
              )}
            >
              <FileText
                className={cn(
                  'h-4 w-4',
                  selectedId === template.id ? 'text-primary-600' : 'text-slate-500'
                )}
              />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-sm font-medium text-slate-900 leading-tight">{template.name}</h3>
              {template.description && (
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{template.description}</p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
