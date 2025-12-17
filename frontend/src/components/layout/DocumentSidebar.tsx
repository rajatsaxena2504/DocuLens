import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FileText,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  Loader2,
  Edit3,
  Home,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, DocumentStatus } from '@/context/SessionContext'
import { cn } from '@/utils/helpers'

export default function DocumentSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { documents, activeDocumentId, setActiveDocument, deleteDocument } = useSession()
  const [isExpanded, setIsExpanded] = useState(true)

  const handleNewDocument = () => {
    navigate('/')
  }

  const handleSelectDocument = (docId: string) => {
    setActiveDocument(docId)
    const doc = documents.find(d => d.id === docId)
    if (doc) {
      switch (doc.status) {
        case 'analyzing':
        case 'ready':
          navigate(`/documents/${docId}/review`)
          break
        case 'generating':
          navigate(`/documents/${docId}/generating`)
          break
        case 'editing':
        case 'completed':
          navigate(`/documents/${docId}/edit`)
          break
      }
    }
  }

  const handleDeleteDocument = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocument(docId)
    }
  }

  const getStatusConfig = (status: DocumentStatus) => {
    switch (status) {
      case 'analyzing':
        return {
          icon: Loader2,
          label: 'Analyzing',
          color: 'text-accent-500',
          bgColor: 'bg-accent-50',
          animate: true,
        }
      case 'ready':
        return {
          icon: Clock,
          label: 'Ready',
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          animate: false,
        }
      case 'generating':
        return {
          icon: Sparkles,
          label: 'Generating',
          color: 'text-primary-500',
          bgColor: 'bg-primary-50',
          animate: true,
        }
      case 'editing':
        return {
          icon: Edit3,
          label: 'Editing',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          animate: false,
        }
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          color: 'text-success-500',
          bgColor: 'bg-success-50',
          animate: false,
        }
    }
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 256 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 pointer-events-none" />

      <div className="relative flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-700/50 px-4">
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary-500 to-accent-500">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-white">Documents</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-4rem)] flex-col">
          {/* Home Link */}
          <button
            onClick={() => navigate('/')}
            className={cn(
              'flex items-center gap-3 border-b border-slate-700/50 px-4 py-3 text-sm transition-colors',
              location.pathname === '/'
                ? 'bg-slate-800/50 text-white'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
            )}
          >
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              location.pathname === '/'
                ? 'bg-primary-500/20 text-primary-400'
                : 'bg-slate-800/50 text-slate-400'
            )}>
              <Home className="h-4 w-4" />
            </div>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Home
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto py-3 px-2">
            {documents.map((doc) => {
              const statusConfig = getStatusConfig(doc.status)
              const StatusIcon = statusConfig.icon
              const isActive = activeDocumentId === doc.id

              return (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc.id)}
                  className={cn(
                    'group relative mb-1 cursor-pointer rounded-xl px-3 py-2.5 transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/10 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive ? statusConfig.bgColor : 'bg-slate-800/50'
                    )}>
                      <StatusIcon className={cn(
                        'h-4 w-4',
                        isActive ? statusConfig.color : 'text-slate-500',
                        statusConfig.animate && 'animate-spin'
                      )} />
                    </div>

                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="min-w-0 flex-1"
                        >
                          <p className="truncate text-sm font-medium">
                            {doc.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className={cn(
                              'text-xs',
                              isActive ? statusConfig.color : 'text-slate-500'
                            )}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isExpanded && (
                      <button
                        onClick={(e) => handleDeleteDocument(e, doc.id)}
                        className="rounded-lg p-1.5 text-slate-500 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {isActive && (
                    <motion.div
                      layoutId="activeDocIndicator"
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-500"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* New Document Button */}
          <div className="border-t border-slate-700/50 p-3">
            <button
              onClick={handleNewDocument}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 py-2.5 text-sm text-slate-400 transition-all',
                'hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-primary-400'
              )}
            >
              <Plus className="h-4 w-4" />
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    New Document
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
