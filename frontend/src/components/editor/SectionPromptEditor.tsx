import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, X, Sparkles, Loader2 } from 'lucide-react'
import Button from '@/components/common/Button'
import { cn } from '@/utils/helpers'

interface SectionPromptEditorProps {
  sectionId: string
  title: string
  description: string
  onSave: (sectionId: string, newDescription: string) => void
  onRegenerate: (sectionId: string, customPrompt?: string) => void
  isRegenerating: boolean
}

export default function SectionPromptEditor({
  sectionId,
  title,
  description,
  onSave: _onSave,
  onRegenerate,
  isRegenerating,
}: SectionPromptEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(description)
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  const handleOpen = () => {
    setIsEditing(true)
    setEditedPrompt(description)
    setAdditionalInstructions('')
  }

  const handleClose = () => {
    setIsEditing(false)
    setEditedPrompt(description)
    setAdditionalInstructions('')
  }

  const handleRegenerate = () => {
    // Combine edited prompt with additional instructions
    const fullPrompt = additionalInstructions
      ? `${editedPrompt}\n\nAdditional Instructions: ${additionalInstructions}`
      : editedPrompt

    onRegenerate(sectionId, fullPrompt)
    setIsEditing(false)
  }

  return (
    <>
      {/* Edit Prompt Button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
        title="Edit prompt and regenerate"
      >
        <Pencil className="h-3 w-3" />
        Edit Prompt
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
                    <Pencil className="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Edit Section Prompt</h3>
                    <p className="text-xs text-slate-500">{title}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Main Prompt */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Section Description / Prompt
                  </label>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    placeholder="Describe what this section should cover..."
                    className={cn(
                      'w-full rounded-lg border border-slate-200 bg-white text-slate-900',
                      'placeholder:text-slate-400',
                      'transition-colors duration-150',
                      'hover:border-slate-300',
                      'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                      'px-4 py-3 text-sm'
                    )}
                    rows={4}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    This description guides the AI in generating content for this section.
                  </p>
                </div>

                {/* Additional Instructions */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Additional Instructions <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="E.g., Focus on security aspects, include code examples, make it more concise..."
                    className={cn(
                      'w-full rounded-lg border border-slate-200 bg-white text-slate-900',
                      'placeholder:text-slate-400',
                      'transition-colors duration-150',
                      'hover:border-slate-300',
                      'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                      'px-4 py-3 text-sm'
                    )}
                    rows={3}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Add specific instructions for this regeneration (tone, focus areas, examples to include, etc.)
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50 border-t border-slate-200">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || !editedPrompt.trim()}
                  leftIcon={isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                >
                  {isRegenerating ? 'Regenerating...' : 'Regenerate Section'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
