import { cn } from '@/utils/helpers'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export default function Loading({ size = 'md', className, text }: LoadingProps) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative">
        {/* Glow effect */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 blur-xl',
            sizes[size]
          )}
        />

        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          className={cn(
            'relative flex items-center justify-center rounded-full',
            'bg-gradient-to-r from-primary-500 to-accent-500',
            sizes[size]
          )}
        >
          <div className={cn(
            'absolute inset-1 rounded-full bg-white',
          )} />
          <Sparkles className={cn('relative z-10 text-primary-600', iconSizes[size])} />
        </motion.div>
      </div>

      {text && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-sm font-medium text-slate-600"
        >
          {text}
        </motion.p>
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
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

// Shimmer effect for loading states
export function ShimmerCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}
