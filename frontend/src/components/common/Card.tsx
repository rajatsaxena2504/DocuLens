import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/helpers'
import { motion, HTMLMotionProps } from 'framer-motion'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<'div'>> {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'gradient'
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  className?: string
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'default',
    interactive = false,
    padding = 'md',
    children,
    ...props
  }, ref) => {
    const variants = {
      default: 'bg-white border border-slate-200/60 shadow-card',
      elevated: 'bg-white border border-slate-200/40 shadow-soft-lg',
      outline: 'bg-white/50 border-2 border-slate-200',
      ghost: 'bg-slate-50/50',
      gradient: 'bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 shadow-card',
    }

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const Component = interactive ? motion.div : 'div'

    return (
      <Component
        ref={ref}
        {...(interactive ? {
          whileHover: { y: -4, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 20px 60px rgba(0, 0, 0, 0.12)' },
          transition: { duration: 0.2 }
        } : {})}
        className={cn(
          'rounded-2xl',
          variants[variant],
          paddings[padding],
          interactive && 'cursor-pointer transition-shadow',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mb-4', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold text-slate-900', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

// Card Description
interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-500 mt-1', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
)
CardContent.displayName = 'CardContent'

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 flex items-center gap-3', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}

export default Card
