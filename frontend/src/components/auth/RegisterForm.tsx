import { useState } from 'react'
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        type="text"
        label="Full name"
        hint="Optional"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        leftIcon={<User className="h-4 w-4" />}
      />

      <Input
        id="email"
        type="email"
        label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        leftIcon={<Mail className="h-4 w-4" />}
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
        leftIcon={<Lock className="h-4 w-4" />}
        required
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        leftIcon={<Lock className="h-4 w-4" />}
        required
      />

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Create account
      </Button>
    </form>
  )
}
