import { useRef, useState } from 'react'
import { Upload, FileText, X, File, CheckCircle } from 'lucide-react'
import { cn } from '@/utils/helpers'

interface TemplateUploadProps {
  file: File | null
  onFileSelect: (file: File) => void
  onFileClear: () => void
}

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function TemplateUpload({
  file,
  onFileSelect,
  onFileClear,
}: TemplateUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return 'Only PDF and DOCX files are accepted'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB'
    }
    return null
  }

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const selectedFile = files[0]
    const validationError = validateFile(selectedFile)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onFileSelect(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileChange(e.dataTransfer.files)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <File className="h-8 w-8 text-danger-500" />
    }
    return <FileText className="h-8 w-8 text-primary-500" />
  }

  if (file) {
    return (
      <div className="rounded-xl border-2 border-success-200 bg-success-50/50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 rounded-xl bg-white p-3 shadow-sm border border-success-100">
            {getFileIcon(file.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-500">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-success-800">Template uploaded</span>
            </div>
            <p className="mt-1.5 truncate text-sm text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onFileClear}
            className="flex-shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-xs text-success-700 bg-success-100/50 rounded-lg px-3 py-2">
          We'll extract sections from this template to structure your documentation.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-accent-400 bg-accent-50/50'
            : error
              ? 'border-danger-300 bg-danger-50/50'
              : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className={cn(
            'mb-4 rounded-xl p-4 transition-all',
            isDragging
              ? 'bg-accent-100 text-accent-600'
              : 'bg-slate-100 text-slate-500'
          )}>
            <Upload className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {isDragging ? 'Drop file here' : 'Drag and drop your template'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            or <span className="text-primary-600 font-medium hover:text-primary-700">browse</span> to upload
          </p>
          <p className="mt-3 text-xs text-slate-400">
            PDF or DOCX, max 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm border border-danger-200">
          <X className="h-4 w-4 text-danger-500" />
          <span className="text-danger-700">{error}</span>
        </div>
      )}
    </div>
  )
}
