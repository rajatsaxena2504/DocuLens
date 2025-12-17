import { useState } from 'react'
import { Download, FileText, File, ChevronDown, FileDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/common/Button'
import { generationApi } from '@/api/sections'
import { storage } from '@/utils/storage'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'

interface ExportOptionsProps {
  documentId: string
  documentTitle: string
}

export default function ExportOptions({ documentId, documentTitle }: ExportOptionsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = async (format: 'markdown' | 'docx' | 'pdf') => {
    setIsExporting(format)
    setIsOpen(false)

    try {
      const url = generationApi.exportDocument(documentId, format)
      const token = storage.getToken()

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${documentTitle}.${format === 'markdown' ? 'md' : format}`
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(downloadUrl)
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(null)
    }
  }

  const exportFormats = [
    { id: 'markdown' as const, label: 'Markdown', ext: '.md', icon: FileText },
    { id: 'docx' as const, label: 'Word Document', ext: '.docx', icon: File },
    { id: 'pdf' as const, label: 'PDF', ext: '.pdf', icon: FileDown },
  ]

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        rightIcon={
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )} />
        }
        leftIcon={<Download className="h-4 w-4" />}
      >
        Export
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <div className="px-3 py-2 mb-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Export Format
                </p>
              </div>

              {exportFormats.map((format) => {
                const Icon = format.icon
                return (
                  <button
                    key={format.id}
                    onClick={() => handleExport(format.id)}
                    disabled={isExporting !== null}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                      'hover:bg-slate-50',
                      isExporting === format.id && 'bg-primary-50'
                    )}
                  >
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      isExporting === format.id
                        ? 'bg-primary-100'
                        : 'bg-slate-100'
                    )}>
                      <Icon className={cn(
                        'h-4 w-4',
                        isExporting === format.id
                          ? 'text-primary-600'
                          : 'text-slate-500'
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {format.label}
                      </p>
                      <p className="text-xs text-slate-400">{format.ext}</p>
                    </div>
                    {isExporting === format.id && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                    )}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
