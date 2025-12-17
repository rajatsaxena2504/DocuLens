import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import toast from 'react-hot-toast'

export default function RegisterForm() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      await register(email, password, name || undefined)
      toast.success('Account created successfully!')
    } catch {
      toast.error('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="name"
        type="text"
        label="Full name"
        hint="Optional"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        leftIcon={<User className="h-5 w-5" />}
      />

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
        hint="At least 6 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create a password"
        leftIcon={<Lock className="h-5 w-5" />}
        required
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        leftIcon={<Lock className="h-5 w-5" />}
        required
      />

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Create account
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
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
