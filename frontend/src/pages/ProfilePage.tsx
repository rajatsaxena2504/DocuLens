import { useState } from 'react'
import { User, Mail, Calendar, Shield, Save, Key } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [isSaving, setIsSaving] = useState(false)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement profile update API
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      // TODO: Implement password change API
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Password changed successfully')
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to change password')
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
            <p className="text-slate-600 mt-1">Manage your account settings</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-semibold">{user?.name || 'User'}</h2>
                  <p className="text-white/80">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  {isEditing ? (
                    <Input
                      label="Display Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Display Name</p>
                        <p className="font-medium text-slate-900">{user?.name || 'Not set'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Email Address</p>
                      <p className="font-medium text-slate-900">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Member Since</p>
                      <p className="font-medium text-slate-900">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Shield className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Account Status</p>
                      <p className="font-medium text-green-600">Active</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSaveProfile} isLoading={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              {/* Password Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Security</h3>

                {showPasswordForm ? (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <Input
                      type="password"
                      label="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      leftIcon={<Key className="w-4 h-4" />}
                      required
                    />
                    <Input
                      type="password"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<Key className="w-4 h-4" />}
                      required
                    />
                    <Input
                      type="password"
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Key className="w-4 h-4" />}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit">Change Password</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
