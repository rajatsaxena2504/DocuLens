import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Calendar, Shield, Save, Key, Building2, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { useAuth } from '@/context/AuthContext'
import { useOrganization } from '@/context/OrganizationContext'
import { RoleBadges, SuperadminBadge } from '@/components/common/RoleBadges'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, isSuperadmin } = useAuth()
  const { currentOrg, currentRoles } = useOrganization()
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-bold">{user?.name || 'User'}</h2>
                  <p className="text-white/80 text-sm mt-0.5">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Basic Information</h3>
                <div className="space-y-3">
                  {isEditing ? (
                    <Input
                      label="Display Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  ) : (
                    <div className="info-row-hover">
                      <div className="info-row-icon">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="info-row-label">Display Name</p>
                        <p className="info-row-value">{user?.name || 'Not set'}</p>
                      </div>
                    </div>
                  )}

                  <div className="info-row-hover">
                    <div className="info-row-icon">
                      <Mail className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="info-row-label">Email Address</p>
                      <p className="info-row-value">{user?.email}</p>
                    </div>
                  </div>

                  <div className="info-row-hover">
                    <div className="info-row-icon">
                      <Calendar className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="info-row-label">Member Since</p>
                      <p className="info-row-value">
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

                  <div className="info-row-hover">
                    <div className="info-row-icon bg-success-100">
                      <Shield className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                      <p className="info-row-label">Account Status</p>
                      <p className="info-row-value text-success-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                        Active
                      </p>
                    </div>
                  </div>

                  {/* System Role */}
                  {isSuperadmin && (
                    <div className="info-row bg-warning-50 border border-warning-200/60">
                      <div className="info-row-icon bg-warning-100">
                        <Crown className="w-5 h-5 text-warning-600" />
                      </div>
                      <div>
                        <p className="info-row-label">System Role</p>
                        <div className="mt-1">
                          <SuperadminBadge />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Organization Role */}
                  <div className="info-row-hover">
                    <div className="info-row-icon bg-primary-100">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="info-row-label">Organization</p>
                      {currentOrg ? (
                        <>
                          <p className="info-row-value">{currentOrg.name}</p>
                          <div className="mt-1.5">
                            {isSuperadmin ? (
                              <span className="text-xs text-warning-600 font-medium">Full access (Superadmin)</span>
                            ) : currentRoles.length > 0 ? (
                              <RoleBadges roles={currentRoles} maxDisplay={4} />
                            ) : (
                              <span className="text-xs text-slate-500">No roles assigned</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500 mt-0.5">
                          Not a member of any organization.{' '}
                          <Link to="/organizations" className="text-primary-600 hover:underline">
                            Request to join one
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
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
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Security</h3>

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
