import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { cn } from '@/utils/helpers'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    containerClassName,
    label,
    error,
    success,
    hint,
    leftIcon,
    rightIcon,
    type = 'text',
    disabled,
    id,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const hasStatus = error || success

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border bg-white text-slate-900 text-sm',
              'placeholder:text-slate-400',
              'transition-colors duration-150',
              'focus:outline-none',
              // Sizes based on icons
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon || isPassword ? 'pr-10' : 'pr-3.5',
              'py-2.5',
              // States
              error
                ? 'border-error-300 focus:border-error-500 focus:ring-2 focus:ring-error-500/20'
                : success
                  ? 'border-success-300 focus:border-success-500 focus:ring-2 focus:ring-success-500/20'
                  : 'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              // Disabled
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}

          {!isPassword && rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}

          {hasStatus && !rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error && <AlertCircle className="h-4 w-4 text-error-500" />}
              {success && <CheckCircle className="h-4 w-4 text-success-500" />}
            </div>
          )}
        </div>

        {(error || success || hint) && (
          <p className={cn(
            'mt-1.5 text-sm',
            error ? 'text-error-600' : success ? 'text-success-600' : 'text-slate-500'
          )}>
            {error || success || hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
