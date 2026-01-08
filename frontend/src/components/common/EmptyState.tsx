import type { LucideIcon } from 'lucide-react'
import Button from './Button'
import { cn } from '@/utils/helpers'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: {
    container: 'py-8 px-4',
    iconWrapper: 'h-12 w-12',
    icon: 'h-6 w-6',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12 px-6',
    iconWrapper: 'h-16 w-16',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    iconWrapper: 'h-20 w-20',
    icon: 'h-10 w-10',
    title: 'text-xl',
    description: 'text-base',
  },
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-slate-100 flex items-center justify-center mb-4',
          sizes.iconWrapper
        )}
      >
        <Icon className={cn('text-slate-400', sizes.icon)} />
      </div>
      <h3 className={cn('font-semibold text-slate-900 mb-2', sizes.title)}>
        {title}
      </h3>
      <p className={cn('text-slate-500 max-w-md mb-6', sizes.description)}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size={size === 'sm' ? 'sm' : 'md'}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// Preset empty states for common scenarios
export const EmptyStatePresets = {
  NoProjects: {
    title: 'No Projects Yet',
    description: 'Create your first project to start documenting your SDLC processes.',
  },
  NoDocuments: {
    title: 'No Documents',
    description: 'This project has no documents yet. Create one to get started.',
  },
  NoResults: {
    title: 'No Results Found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  NoMembers: {
    title: 'No Members',
    description: 'Add team members to collaborate on this organization.',
  },
  NoTemplates: {
    title: 'No Templates',
    description: 'Create templates to speed up your document creation process.',
  },
  Error: {
    title: 'Something Went Wrong',
    description: 'We couldn\'t load the data. Please try again.',
  },
}
