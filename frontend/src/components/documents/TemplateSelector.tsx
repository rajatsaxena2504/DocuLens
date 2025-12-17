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

  if (isLoading) return <Loading className="py-8" />

  if (!templates || templates.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No templates available</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template)}
          className={cn(
            'relative rounded-xl border-2 p-4 text-left transition-all',
            selectedId === template.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          {selectedId === template.id && (
            <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                selectedId === template.id ? 'bg-primary-200' : 'bg-gray-100'
              )}
            >
              <FileText
                className={cn(
                  'h-5 w-5',
                  selectedId === template.id ? 'text-primary-700' : 'text-gray-500'
                )}
              />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              {template.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.description}</p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
