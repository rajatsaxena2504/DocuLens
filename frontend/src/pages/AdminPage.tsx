import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { adminApi } from '@/api/admin'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import ConfirmModal from '@/components/common/ConfirmModal'
import { SuperadminBadge } from '@/components/common/RoleBadges'
import { Shield, Building2, Users, Plus, Trash2, Crown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AdminUserResponse, AdminOrganizationResponse } from '@/types'

export default function AdminPage() {
  const { isSuperadmin } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [organizations, setOrganizations] = useState<AdminOrganizationResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'organizations' | 'users'>('organizations')

  // Create org dialog
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [newOrgOwnerEmail, setNewOrgOwnerEmail] = useState('')
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  // Grant superadmin dialog
  const [grantSuperadminOpen, setGrantSuperadminOpen] = useState(false)
  const [grantSuperadminEmail, setGrantSuperadminEmail] = useState('')
  const [isGrantingSuperadmin, setIsGrantingSuperadmin] = useState(false)

  // Confirm dialogs
  const [revokeUserId, setRevokeUserId] = useState<string | null>(null)
  const [revokeUserEmail, setRevokeUserEmail] = useState<string>('')
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [deleteOrgName, setDeleteOrgName] = useState<string>('')

  useEffect(() => {
    if (!isSuperadmin) {
      navigate('/')
      return
    }
    loadData()
  }, [isSuperadmin, navigate])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [usersData, orgsData] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listOrganizations(),
      ])
      setUsers(usersData)
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Failed to load admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim() || !newOrgOwnerEmail.trim()) {
      toast.error('Name and owner email are required')
      return
    }

    setIsCreatingOrg(true)
    try {
      await adminApi.createOrganizationWithOwner({
        name: newOrgName.trim(),
        slug: newOrgSlug.trim() || undefined,
        owner_email: newOrgOwnerEmail.trim(),
      })
      toast.success('Organization created successfully')
      setCreateOrgOpen(false)
      setNewOrgName('')
      setNewOrgSlug('')
      setNewOrgOwnerEmail('')
      loadData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to create organization')
    } finally {
      setIsCreatingOrg(false)
    }
  }

  const handleGrantSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantSuperadminEmail.trim()) {
      toast.error('Email is required')
      return
    }

    setIsGrantingSuperadmin(true)
    try {
      await adminApi.grantSuperadminByEmail({ email: grantSuperadminEmail.trim() })
      toast.success('Superadmin granted successfully')
      setGrantSuperadminOpen(false)
      setGrantSuperadminEmail('')
      loadData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to grant superadmin')
    } finally {
      setIsGrantingSuperadmin(false)
    }
  }

  const handleRevokeSuperadmin = async () => {
    if (!revokeUserId) return

    try {
      await adminApi.revokeSuperadmin(revokeUserId)
      toast.success('Superadmin revoked successfully')
      setRevokeUserId(null)
      loadData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to revoke superadmin')
    }
  }

  const handleDeleteOrg = async () => {
    if (!deleteOrgId) return

    try {
      await adminApi.deleteOrganization(deleteOrgId)
      toast.success('Organization deleted successfully')
      setDeleteOrgId(null)
      loadData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to delete organization')
    }
  }

  if (!isSuperadmin) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">System-wide administration</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'organizations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Organizations ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Users ({users.length})
          </button>
        </div>

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">All Organizations</h2>
              <Button onClick={() => setCreateOrgOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
                <p className="text-slate-500">Loading...</p>
              </div>
            ) : organizations.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
                <p className="text-slate-500">No organizations yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Slug</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Members</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Created</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">{org.name}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">/{org.slug}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{org.member_count}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(org.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              setDeleteOrgId(org.id)
                              setDeleteOrgName(org.name)
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
              <Button onClick={() => setGrantSuperadminOpen(true)}>
                <Crown className="h-4 w-4 mr-2" />
                Grant Superadmin
              </Button>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
                <p className="text-slate-500">Loading...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
                <p className="text-slate-500">No users yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Created</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium text-slate-900">{user.email}</span>
                            {user.is_superadmin && <SuperadminBadge size="sm" />}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{user.name || '-'}</td>
                        <td className="px-5 py-4 text-sm">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-success-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-error-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-error-500" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-right">
                          {user.is_superadmin ? (
                            <button
                              onClick={() => {
                                setRevokeUserId(user.id)
                                setRevokeUserEmail(user.email)
                              }}
                              className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all duration-200"
                              title="Revoke superadmin"
                            >
                              <Crown className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setGrantSuperadminEmail(user.email)
                                setGrantSuperadminOpen(true)
                              }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                              title="Grant superadmin"
                            >
                              <Crown className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      <Modal
        isOpen={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title="Create Organization"
        size="md"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <p className="text-sm text-slate-500 mb-4">
            Create a new organization and assign an initial owner.
          </p>
          <Input
            id="org-name"
            label="Organization Name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="My Organization"
            required
          />
          <Input
            id="org-slug"
            label="Slug (optional)"
            value={newOrgSlug}
            onChange={(e) => setNewOrgSlug(e.target.value)}
            placeholder="my-organization"
            hint="Leave empty to auto-generate from name"
          />
          <Input
            id="owner-email"
            label="Owner Email"
            type="email"
            value={newOrgOwnerEmail}
            onChange={(e) => setNewOrgOwnerEmail(e.target.value)}
            placeholder="owner@example.com"
            hint="This user will become the organization owner"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateOrgOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingOrg}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Grant Superadmin Modal */}
      <Modal
        isOpen={grantSuperadminOpen}
        onClose={() => setGrantSuperadminOpen(false)}
        title="Grant Superadmin"
        size="md"
      >
        <form onSubmit={handleGrantSuperadmin} className="space-y-4">
          <p className="text-sm text-slate-500 mb-4">
            Grant superadmin privileges to a user by email.
          </p>
          <Input
            id="superadmin-email"
            label="User Email"
            type="email"
            value={grantSuperadminEmail}
            onChange={(e) => setGrantSuperadminEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setGrantSuperadminOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" isLoading={isGrantingSuperadmin}>
              Grant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Superadmin Confirmation */}
      <ConfirmModal
        isOpen={!!revokeUserId}
        onClose={() => setRevokeUserId(null)}
        onConfirm={handleRevokeSuperadmin}
        title="Revoke Superadmin"
        message={
          <p>
            Are you sure you want to revoke superadmin privileges from <strong>{revokeUserEmail}</strong>?
            They will lose access to the admin dashboard.
          </p>
        }
        confirmText="Revoke"
        variant="danger"
      />

      {/* Delete Organization Confirmation */}
      <ConfirmModal
        isOpen={!!deleteOrgId}
        onClose={() => setDeleteOrgId(null)}
        onConfirm={handleDeleteOrg}
        title="Delete Organization"
        message={
          <div>
            <p>Are you sure you want to delete <strong>{deleteOrgName}</strong>?</p>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete the organization and all its data.
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete Organization"
        variant="danger"
      />
    </Layout>
  )
}
