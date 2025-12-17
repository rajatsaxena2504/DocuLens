import { useState, useRef, useEffect } from 'react'
import {
  GripVertical,
  Check,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Square,
  CheckSquare,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/utils/helpers'
import type { DocumentSection } from '@/types'

interface SectionPlanItemProps {
  section: DocumentSection
  index: number
  totalCount: number
  onUpdate: (updates: { custom_title?: string; custom_description?: string; is_included?: boolean }) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function SectionPlanItem({
  section,
  index,
  totalCount,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionPlanItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)  // Auto-expand to show description
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editTitle, setEditTitle] = useState(section.title)
  const [editDescription, setEditDescription] = useState(section.description)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
    }
  }, [isEditingDescription])

  const handleToggleInclude = () => {
    onUpdate({ is_included: !section.is_included })
  }

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== section.title) {
      onUpdate({ custom_title: editTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleSaveDescription = () => {
    if (editDescription !== section.description) {
      onUpdate({ custom_description: editDescription })
    }
    setIsEditingDescription(false)
  }

  const handleCancelTitle = () => {
    setEditTitle(section.title)
    setIsEditingTitle(false)
  }

  const handleCancelDescription = () => {
    setEditDescription(section.description)
    setIsEditingDescription(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent, save: () => void, cancel: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border-2 bg-white transition-all',
        isDragging && 'shadow-xl ring-2 ring-primary-400 opacity-90',
        section.is_included
          ? 'border-gray-200 hover:border-gray-300'
          : 'border-dashed border-gray-200 bg-gray-50 opacity-60'
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={handleToggleInclude}
          className={cn(
            'rounded p-1 transition-colors',
            section.is_included
              ? 'text-primary-600 hover:text-primary-700'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          {section.is_included ? (
            <CheckSquare className="h-5 w-5" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>

        {/* Index badge */}
        <span className={cn(
          'flex h-6 w-6 items-center justify-center rounded text-xs font-medium',
          section.is_included
            ? 'bg-primary-100 text-primary-700'
            : 'bg-gray-100 text-gray-500'
        )}>
          {index + 1}
        </span>

        {/* Title - inline editable */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveTitle, handleCancelTitle)}
                onBlur={handleSaveTitle}
                className="flex-1 rounded border border-primary-300 px-2 py-1 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={handleSaveTitle}
                className="rounded p-1 text-green-600 hover:bg-green-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancelTitle}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  'cursor-text truncate font-medium',
                  section.is_included ? 'text-gray-900' : 'text-gray-500'
                )}
              >
                {section.title}
              </span>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Move Up */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            disabled={index === 0}
            className={cn(
              'rounded p-1 transition-colors',
              index === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            title="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          {/* Move Down */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            disabled={index === totalCount - 1}
            className={cn(
              'rounded p-1 transition-colors',
              index === totalCount - 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Delete */}
          <button
            onClick={onRemove}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded description */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3 pl-14">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase">Description</div>
            {!isEditingDescription && (
              <button
                onClick={() => setIsEditingDescription(true)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="space-y-2">
              <textarea
                ref={descriptionInputRef}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveDescription, handleCancelDescription)}
                rows={4}
                placeholder="Describe what this section should cover..."
                className="w-full rounded border border-primary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelDescription}
                  className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDescription}
                  className="rounded bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
                >
                  Save Description
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingDescription(true)}
              className="cursor-text rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {section.description || 'Click to add a description...'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
