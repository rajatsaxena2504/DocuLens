import { cn } from '@/utils/helpers'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export default function Loading({ size = 'md', className, text }: LoadingProps) {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-primary-600', sizes[size])} />
      {text && (
        <p className="mt-3 text-sm text-slate-500">{text}</p>
      )}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loading size="lg" text="Loading..." />
    </div>
  )
}

// Skeleton loader for cards
export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

// Shimmer effect for loading states
export function ShimmerCard() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
