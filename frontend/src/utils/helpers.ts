import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700'
    case 'sections_approved':
      return 'bg-primary-100 text-primary-700'
    case 'generating':
      return 'bg-accent-100 text-accent-700'
    case 'completed':
      return 'bg-success-100 text-success-700'
    case 'editing':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'sections_approved':
      return 'Ready'
    case 'generating':
      return 'Generating'
    case 'completed':
      return 'Complete'
    case 'editing':
      return 'Editing'
    default:
      return status
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'draft':
      return 'file'
    case 'sections_approved':
      return 'check-circle'
    case 'generating':
      return 'loader'
    case 'completed':
      return 'check-circle-2'
    case 'editing':
      return 'edit'
    default:
      return 'file'
  }
}
