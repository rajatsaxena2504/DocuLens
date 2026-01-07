import { useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  Plus,
  RotateCcw,
  GitCompare,
  Loader2,
  Clock,
  User,
  X,
} from 'lucide-react'
import Button from '@/components/common/Button'
import {
  useDocumentVersions,
  useCreateVersion,
  useRestoreVersion,
} from '@/hooks/useDocumentVersions'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'
import type { DocumentVersion } from '@/types'

interface VersionPanelProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
  onCompare: (fromVersion: number, toVersion: number) => void
}

export default function VersionPanel({
  documentId,
  isOpen,
  onClose,
  onCompare,
}: VersionPanelProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [changeSummary, setChangeSummary] = useState('')
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])

  const { data: versionData, isLoading } = useDocumentVersions(documentId)
  const createVersion = useCreateVersion()
  const restoreVersion = useRestoreVersion()

  const handleSaveVersion = () => {
    createVersion.mutate(
      {
        documentId,
        data: { change_summary: changeSummary || undefined },
      },
      {
        onSuccess: () => {
          toast.success('Version saved')
          setShowSaveModal(false)
          setChangeSummary('')
        },
        onError: () => {
          toast.error('Failed to save version')
        },
      }
    )
  }

  const handleRestoreVersion = (version: DocumentVersion) => {
    if (
      confirm(
        `Restore to version ${version.version_number}? This will replace current content.`
      )
    ) {
      restoreVersion.mutate(
        {
          documentId,
          data: {
            version_number: version.version_number,
            change_summary: `Restored from version ${version.version_number}`,
          },
        },
        {
          onSuccess: () => {
            toast.success(`Restored to version ${version.version_number}`)
          },
          onError: () => {
            toast.error('Failed to restore version')
          },
        }
      )
    }
  }

  const toggleVersionSelection = (versionNumber: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionNumber)) {
        return prev.filter((v) => v !== versionNumber)
      }
      if (prev.length >= 2) {
        return [prev[1], versionNumber]
      }
      return [...prev, versionNumber]
    })
  }

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const [from, to] = selectedVersions.sort((a, b) => a - b)
      onCompare(from, to)
      setSelectedVersions([])
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed right-0 top-0 z-40 h-full w-80 bg-white border-l border-slate-200 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Version History</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="border-b border-slate-100 p-3 space-y-2">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => setShowSaveModal(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Save Current Version
            </Button>

            {selectedVersions.length === 2 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCompare}
                leftIcon={<GitCompare className="h-3.5 w-3.5" />}
              >
                Compare Selected
              </Button>
            )}

            {selectedVersions.length > 0 && selectedVersions.length < 2 && (
              <p className="text-xs text-slate-500 text-center">
                Select one more version to compare
              </p>
            )}
          </div>

          {/* Version List */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : versionData?.versions && versionData.versions.length > 0 ? (
              <div className="space-y-2">
                {versionData.versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isSelected={selectedVersions.includes(version.version_number)}
                    isCurrent={version.version_number === versionData.current_version}
                    onSelect={() => toggleVersionSelection(version.version_number)}
                    onRestore={() => handleRestoreVersion(version)}
                    isRestoring={restoreVersion.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <History className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No versions yet</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Save your first version to start tracking changes
                </p>
              </div>
            )}
          </div>

          {/* Save Version Modal */}
          <AnimatePresence>
            {showSaveModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 flex items-center justify-center p-4"
                onClick={() => setShowSaveModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Save Version
                  </h3>
                  <textarea
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Describe your changes (optional)..."
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm placeholder:text-slate-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSaveModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveVersion}
                      isLoading={createVersion.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface VersionItemProps {
  version: DocumentVersion
  isSelected: boolean
  isCurrent: boolean
  onSelect: () => void
  onRestore: () => void
  isRestoring: boolean
}

function VersionItem({
  version,
  isSelected,
  isCurrent,
  onSelect,
  onRestore,
  isRestoring,
}: VersionItemProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all cursor-pointer',
        isSelected
          ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded text-xs font-semibold',
              isCurrent
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {version.version_number}
          </span>
          {isCurrent && (
            <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
              Current
            </span>
          )}
        </div>

        <AnimatePresence>
          {showActions && !isCurrent && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation()
                onRestore()
              }}
              disabled={isRestoring}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
            >
              <RotateCcw className="h-3 w-3" />
              Restore
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {version.change_summary && (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
          {version.change_summary}
        </p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(version.created_at), 'MMM d, h:mm a')}
        </span>
        {version.creator_name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {version.creator_name}
          </span>
        )}
      </div>
    </div>
  )
}
