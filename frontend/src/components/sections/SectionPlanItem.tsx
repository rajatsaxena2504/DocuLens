import { useState, useRef, useEffect } from 'react'
import {
  GripVertical,
  Check,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  Square,
  CheckSquare,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isExpanded, setIsExpanded] = useState(true)
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
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group rounded-2xl border-2 bg-white transition-all duration-200',
        isDragging && 'shadow-2xl ring-2 ring-primary-400 scale-[1.02] z-50',
        section.is_included
          ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          : 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={handleToggleInclude}
          className={cn(
            'rounded-lg p-1.5 transition-all duration-200',
            section.is_included
              ? 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
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
          'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
          section.is_included
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500'
        )}>
          {index + 1}
        </span>

        {/* Title - inline editable */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveTitle, handleCancelTitle)}
                onBlur={handleSaveTitle}
                className="flex-1 rounded-xl border-2 border-primary-300 px-3 py-1.5 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
              />
              <button
                onClick={handleSaveTitle}
                className="rounded-lg p-1.5 text-success-600 hover:bg-success-50 transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancelTitle}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  'cursor-text truncate font-semibold transition-colors',
                  section.is_included ? 'text-slate-900' : 'text-slate-500'
                )}
              >
                {section.title}
              </span>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
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
              'rounded-lg p-1.5 transition-all duration-200',
              index === 0
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
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
              'rounded-lg p-1.5 transition-all duration-200',
              index === totalCount - 1
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            )}
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>

          {/* Delete */}
          <button
            onClick={onRemove}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded description */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 py-4 pl-16">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Description
                </div>
                {!isEditingDescription && (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="space-y-3">
                  <textarea
                    ref={descriptionInputRef}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveDescription, handleCancelDescription)}
                    rows={4}
                    placeholder="Describe what this section should cover..."
                    className="w-full rounded-xl border-2 border-primary-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelDescription}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 text-sm font-medium text-white hover:from-primary-700 hover:to-primary-600 shadow-sm transition-all"
                    >
                      Save Description
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="cursor-text rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 hover:border-primary-300 hover:bg-primary-50/30 transition-all"
                >
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {section.description || 'Click to add a description...'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
