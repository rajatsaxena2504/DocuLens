import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Database,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  FileQuestion,
  Eye,
  Plus,
  Code2,
} from 'lucide-react'
import { useFileTree, useAnalyzeFile, useCreateFileDocument } from '../../hooks/useFiles'
import Button from '../common/Button'
import type { FileTreeNode, FileType } from '../../types'
import toast from 'react-hot-toast'

interface FileBrowserProps {
  projectId: string
  sdlcProjectId?: string
  stageId?: string
  onFileSelect?: (filePath: string) => void
}

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  python: <FileCode className="h-4 w-4 text-yellow-500" />,
  javascript: <FileCode className="h-4 w-4 text-yellow-400" />,
  typescript: <FileCode className="h-4 w-4 text-blue-500" />,
  sql: <Database className="h-4 w-4 text-orange-500" />,
  ipynb: <Code2 className="h-4 w-4 text-orange-400" />,
}

function getFileIcon(fileType: FileType | null, extension?: string): React.ReactNode {
  if (fileType && FILE_TYPE_ICONS[fileType]) {
    return FILE_TYPE_ICONS[fileType]
  }
  if (extension === 'md' || extension === 'txt') {
    return <FileText className="h-4 w-4 text-slate-400" />
  }
  return <FileQuestion className="h-4 w-4 text-slate-400" />
}

export default function FileBrowser({
  projectId,
  sdlcProjectId,
  stageId,
  onFileSelect,
}: FileBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const { data: fileTree, isLoading } = useFileTree(projectId)
  const analyzeFile = useAnalyzeFile(projectId)
  const createFileDocument = useCreateFileDocument()

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleFileClick = (node: FileTreeNode) => {
    if (node.is_directory) {
      toggleFolder(node.path)
    } else {
      setSelectedFile(node.path)
      onFileSelect?.(node.path)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    try {
      await analyzeFile.mutateAsync({ file_path: selectedFile })
      setShowAnalysis(true)
      toast.success('File analyzed')
    } catch {
      toast.error('Failed to analyze file')
    }
  }

  const handleCreateDocument = async () => {
    if (!selectedFile) return
    try {
      await createFileDocument.mutateAsync({
        project_id: projectId,
        sdlc_project_id: sdlcProjectId,
        stage_id: stageId,
        file_path: selectedFile,
      })
      toast.success('File document created')
    } catch {
      toast.error('Failed to create document')
    }
  }

  // Filter tree based on search
  const filterTree = useMemo(() => {
    if (!searchQuery || !fileTree) return fileTree

    const searchLower = searchQuery.toLowerCase()

    const filterNode = (node: FileTreeNode): FileTreeNode | null => {
      if (!node.is_directory) {
        return node.name.toLowerCase().includes(searchLower) ? node : null
      }

      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((n): n is FileTreeNode => n !== null)

      if (filteredChildren && filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }

      return node.name.toLowerCase().includes(searchLower) ? node : null
    }

    return filterNode(fileTree)
  }, [fileTree, searchQuery])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!fileTree) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <Folder className="mx-auto h-12 w-12 text-slate-300" />
        <h4 className="mt-4 font-medium text-slate-900">No files available</h4>
        <p className="mt-2 text-sm text-slate-500">
          Analyze the project repository first to browse files.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">File Browser</h3>
          <p className="text-sm text-slate-500">
            Browse project files and create file-level documentation.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="flex gap-4">
        {/* File Tree */}
        <div className="flex-1 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto p-2">
            {filterTree && (
              <TreeNode
                node={filterTree}
                expandedFolders={expandedFolders}
                selectedFile={selectedFile}
                onNodeClick={handleFileClick}
                depth={0}
              />
            )}
          </div>
        </div>

        {/* Selected File Panel */}
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 rounded-lg border border-slate-200 bg-white p-4"
          >
            <h4 className="font-medium text-slate-900 truncate" title={selectedFile}>
              {selectedFile.split('/').pop()}
            </h4>
            <p className="mt-1 text-xs text-slate-500 truncate">{selectedFile}</p>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleAnalyze}
                isLoading={analyzeFile.isPending}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Analyze File
              </Button>
              <Button
                size="sm"
                className="w-full justify-start"
                onClick={handleCreateDocument}
                isLoading={createFileDocument.isPending}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create Documentation
              </Button>
            </div>

            {/* Analysis Results */}
            <AnimatePresence>
              {showAnalysis && analyzeFile.data && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 border-t border-slate-200 pt-4"
                >
                  <h5 className="text-sm font-medium text-slate-700 mb-2">Analysis</h5>
                  <div className="space-y-2 text-xs">
                    <div className="rounded bg-slate-50 p-2">
                      <span className="text-slate-500">Type:</span>{' '}
                      <span className="font-medium text-slate-700">
                        {analyzeFile.data.file_type}
                      </span>
                    </div>
                    {analyzeFile.data.suggested_sections.length > 0 && (
                      <div className="rounded bg-slate-50 p-2">
                        <span className="text-slate-500 block mb-1">Suggested Sections:</span>
                        <ul className="list-disc list-inside text-slate-700">
                          {analyzeFile.data.suggested_sections.map((section, i) => (
                            <li key={i}>{section}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ============ Tree Node Component ============

interface TreeNodeProps {
  node: FileTreeNode
  expandedFolders: Set<string>
  selectedFile: string | null
  onNodeClick: (node: FileTreeNode) => void
  depth: number
}

function TreeNode({
  node,
  expandedFolders,
  selectedFile,
  onNodeClick,
  depth,
}: TreeNodeProps) {
  const isExpanded = expandedFolders.has(node.path)
  const isSelected = selectedFile === node.path
  const extension = node.name.split('.').pop()

  return (
    <div>
      <button
        onClick={() => onNodeClick(node)}
        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? 'bg-primary-50 text-primary-700'
            : 'text-slate-700 hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.is_directory ? (
          <>
            <span className="text-slate-400">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            {getFileIcon(node.file_type, extension)}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {/* Children */}
      <AnimatePresence>
        {node.is_directory && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                expandedFolders={expandedFolders}
                selectedFile={selectedFile}
                onNodeClick={onNodeClick}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
