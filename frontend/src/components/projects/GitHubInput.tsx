import { useState, useEffect } from 'react'
import { Github, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/utils/helpers'

interface GitHubInputProps {
  value: string
  onChange: (value: string) => void
  onValidation: (isValid: boolean) => void
  error?: string
  onErrorClear?: () => void
}

// GitHub URL validation regex
const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+(\/)?(\?.*)?$/

export default function GitHubInput({
  value,
  onChange,
  onValidation,
  error,
  onErrorClear,
}: GitHubInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null)

  useEffect(() => {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      setIsValid(false)
      setRepoInfo(null)
      onValidation(false)
      return
    }

    // Check if URL matches GitHub pattern
    const isValidUrl = GITHUB_URL_REGEX.test(trimmedValue)
    setIsValid(isValidUrl)
    onValidation(isValidUrl)

    if (isValidUrl) {
      // Extract owner and repo name
      const match = trimmedValue.match(/github\.com\/([\w-]+)\/([\w.-]+)/)
      if (match) {
        setRepoInfo({
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        })
      }
    } else {
      setRepoInfo(null)
    }
  }, [value, onValidation])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    if (error && onErrorClear) {
      onErrorClear()
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative flex items-center rounded-xl border-2 bg-white transition-all duration-200',
          isFocused
            ? 'border-primary-500 ring-4 ring-primary-500/10'
            : error
              ? 'border-danger-300 bg-danger-50/50'
              : isValid && value
                ? 'border-success-400 bg-success-50/30'
                : 'border-slate-200 hover:border-slate-300'
        )}
      >
        <div className="flex items-center pl-4">
          <Github className={cn(
            'h-5 w-5 transition-colors',
            isFocused ? 'text-primary-500' : isValid && value ? 'text-success-500' : 'text-slate-400'
          )} />
        </div>
        <input
          type="url"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="https://github.com/username/repository"
          className="flex-1 border-0 bg-transparent px-3 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        {value && (
          <div className="flex items-center pr-4">
            {isValid ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-100">
                <Check className="h-4 w-4 text-success-600" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-100">
                <AlertCircle className="h-4 w-4 text-danger-500" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 text-danger-500" />
          <span className="text-danger-700">{error}</span>
        </div>
      )}

      {/* Valid repo info */}
      {isValid && repoInfo && (
        <div className="flex items-center gap-3 rounded-xl bg-success-50 px-4 py-3 text-sm border border-success-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-100">
            <Check className="h-4 w-4 text-success-600" />
          </div>
          <div className="flex-1">
            <span className="text-success-800">
              Repository: <strong>{repoInfo.owner}/{repoInfo.repo}</strong>
            </span>
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-success-100 px-2.5 py-1.5 text-xs font-medium text-success-700 hover:bg-success-200 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </a>
        </div>
      )}

      {/* Helper text */}
      {!value && !error && (
        <p className="text-xs text-slate-500">
          Supports public and private repositories. For private repos, ensure you have access configured.
        </p>
      )}
    </div>
  )
}
