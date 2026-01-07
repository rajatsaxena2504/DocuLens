import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Loader2, Mail, Shield } from 'lucide-react'
import Button from '@/components/common/Button'
import { useAddProjectMember } from '@/hooks/useSDLCProjects'
import { cn } from '@/utils/helpers'
import toast from 'react-hot-toast'
import type { ProjectRole } from '@/types'

interface AddMemberModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

const roles: { value: ProjectRole; label: string; description: string }[] = [
  { value: 'editor', label: 'Editor', description: 'Can edit documents and project settings' },
  { value: 'viewer', label: 'Viewer', description: 'Can only view documents' },
]

export default function AddMemberModal({ projectId, isOpen, onClose }: AddMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('editor')
  const addMember = useAddProjectMember()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    addMember.mutate(
      { projectId, data: { email: email.trim(), role } },
      {
        onSuccess: () => {
          toast.success('Member added successfully')
          setEmail('')
          setRole('editor')
          onClose()
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to add member')
        },
      }
    )
  }

  const handleClose = () => {
    if (!addMember.isPending) {
      setEmail('')
      setRole('editor')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary-500" />
                  <h2 className="text-lg font-semibold text-slate-900">Add Team Member</h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={addMember.isPending}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                {/* Email Input */}
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      disabled={addMember.isPending}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    The user must have an existing account to be added
                  </p>
                </div>

                {/* Role Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4" />
                      Role
                    </div>
                  </label>
                  <div className="space-y-2">
                    {roles.map((r) => (
                      <label
                        key={r.value}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          role === r.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={r.value}
                          checked={role === r.value}
                          onChange={(e) => setRole(e.target.value as ProjectRole)}
                          disabled={addMember.isPending}
                          className="mt-0.5 text-primary-500 focus:ring-primary-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{r.label}</p>
                          <p className="text-xs text-slate-500">{r.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={addMember.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addMember.isPending || !email.trim()}
                    leftIcon={
                      addMember.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )
                    }
                  >
                    {addMember.isPending ? 'Adding...' : 'Add Member'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
