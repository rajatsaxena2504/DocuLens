import { BookOpen, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900">
        {/* Content */}
        <div className="flex flex-col justify-center px-16 py-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">DocuLens</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Start creating professional documentation
          </h1>

          <p className="text-base text-slate-400 mb-8 max-w-md">
            Join developers who trust DocuLens for their SDLC documentation needs.
          </p>

          {/* Benefits */}
          <div className="space-y-3">
            {[
              'Free to get started',
              'No credit card required',
              'Unlimited projects',
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-success-600/20">
                  <Check className="h-3 w-3 text-success-400" />
                </div>
                <span className="text-sm text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-page px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">DocuLens</span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Create your account</h2>
            <p className="mt-1 text-sm text-slate-500">Start generating documentation today</p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
