import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import toast from 'react-hot-toast'

export default function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success('Welcome back!')
    } catch {
      toast.error('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="email"
        type="email"
        label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        leftIcon={<Mail className="h-5 w-5" />}
        required
      />

      <Input
        id="password"
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        leftIcon={<Lock className="h-5 w-5" />}
        required
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Remember me
        </label>
        <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors">
          Forgot password?
        </a>
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Sign in
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-slate-500">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
        >
          Sign up for free
        </Link>
      </p>
    </form>
  )
}
