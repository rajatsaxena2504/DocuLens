import { forwardRef } from 'react'
import { cn } from '@/utils/helpers'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
      'inline-flex items-center justify-center font-medium rounded-xl',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none'
    )

    const variants = {
      primary: cn(
        'text-white',
        'bg-gradient-to-r from-primary-600 to-primary-500',
        'hover:from-primary-700 hover:to-primary-600',
        'shadow-lg shadow-primary-500/25',
        'hover:shadow-xl hover:shadow-primary-500/30',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:ring-primary-500'
      ),
      secondary: cn(
        'text-slate-700 bg-white',
        'border border-slate-200',
        'hover:bg-slate-50 hover:border-slate-300',
        'shadow-sm hover:shadow',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:ring-primary-500'
      ),
      outline: cn(
        'text-primary-600 bg-transparent',
        'border-2 border-primary-200',
        'hover:bg-primary-50 hover:border-primary-300',
        'focus-visible:ring-primary-500'
      ),
      ghost: cn(
        'text-slate-600',
        'hover:text-slate-900 hover:bg-slate-100',
        'focus-visible:ring-slate-500'
      ),
      danger: cn(
        'text-white',
        'bg-gradient-to-r from-red-600 to-red-500',
        'hover:from-red-700 hover:to-red-600',
        'shadow-lg shadow-red-500/25',
        'hover:shadow-xl hover:shadow-red-500/30',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:ring-red-500'
      ),
      success: cn(
        'text-white',
        'bg-gradient-to-r from-success-600 to-success-500',
        'hover:from-success-700 hover:to-success-600',
        'shadow-lg shadow-success-500/25',
        'hover:shadow-xl hover:shadow-success-500/30',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:ring-success-500'
      ),
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
      xl: 'px-8 py-4 text-lg gap-3',
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn(
            'animate-spin',
            size === 'sm' ? 'h-3.5 w-3.5' : size === 'xl' ? 'h-5 w-5' : 'h-4 w-4'
          )} />
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
