import { forwardRef } from 'react'
import { cn } from '@/utils/helpers'
import { Loader2 } from 'lucide-react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    leftIcon,
    rightIcon,
    children,
    disabled,
    type = 'button',
    onClick,
    ...props
  }, ref) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/50',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
      'active:scale-[0.98]'
    )

    const variants = {
      primary: cn(
        'bg-primary-600 text-white',
        'hover:bg-primary-700',
        'active:bg-primary-800'
      ),
      secondary: cn(
        'bg-white text-slate-700',
        'border border-slate-200',
        'hover:bg-slate-50 hover:border-slate-300',
        'active:bg-slate-100'
      ),
      outline: cn(
        'bg-transparent text-primary-600',
        'border border-primary-200',
        'hover:bg-primary-50 hover:border-primary-300',
        'active:bg-primary-100'
      ),
      ghost: cn(
        'bg-transparent text-slate-600',
        'hover:bg-slate-100 hover:text-slate-900',
        'active:bg-slate-200'
      ),
      danger: cn(
        'bg-error-600 text-white',
        'hover:bg-error-700',
        'active:bg-error-800'
      ),
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-5 py-3 text-base gap-2',
    }

    const iconSizes = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    }

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
