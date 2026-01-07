import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  Settings,
  Trash2,
  UserPlus,
  Mail,
} from 'lucide-react'
import { organizationsApi } from '@/api/organizations'
import { useOrganization } from '@/context/OrganizationContext'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { PageLoading } from '@/components/common/Loading'
import toast from 'react-hot-toast'
import type { OrganizationDetail, OrganizationMember, OrganizationRole } from '@/types'

export default function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const { refreshOrganizations } = useOrganization()

  const [organization, setOrganization] = useState<OrganizationDetail | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general')

  // Form states
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('viewer')
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (orgId) {
      loadOrganization()
      loadMembers()
    }
  }, [orgId])

  const loadOrganization = async () => {
    try {
      const org = await organizationsApi.get(orgId!)
      setOrganization(org)
      setName(org.name)
    } catch (error) {
      console.error('Failed to load organization:', error)
      toast.error('Failed to load organization')
      navigate('/organizations')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      const membersList = await organizationsApi.listMembers(orgId!)
      setMembers(membersList)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Organization name is required')
      return
    }

    setIsSaving(true)
    try {
      await organizationsApi.update(orgId!, { name: name.trim() })
      await refreshOrganizations()
      toast.success('Organization updated')
    } catch (error) {
      toast.error('Failed to update organization')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Email is required')
      return
    }

    setIsInviting(true)
    try {
      await organizationsApi.inviteMember(orgId!, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      await loadMembers()
      setInviteEmail('')
      setInviteRole('viewer')
      toast.success('Member added successfully')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to add member'
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: OrganizationRole) => {
    try {
      await organizationsApi.updateMemberRole(orgId!, memberId, { role: newRole })
      await loadMembers()
      toast.success('Role updated')
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this organization?`)) return

    try {
      await organizationsApi.removeMember(orgId!, memberId)
      await loadMembers()
      toast.success('Member removed')
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const handleDeleteOrg = async () => {
    if (!confirm('Are you sure you want to delete this organization? This cannot be undone.')) return

    try {
      await organizationsApi.delete(orgId!)
      await refreshOrganizations()
      toast.success('Organization deleted')
      navigate('/organizations')
    } catch (error) {
      toast.error('Failed to delete organization')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700'
      case 'editor':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  if (!organization) return null

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/organizations')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to organizations
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-xl bg-primary-100 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{organization.name}</h1>
            <p className="text-sm text-slate-500">Organization settings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'general'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'members'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Members ({members.length})
          </button>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <form
              onSubmit={handleSaveGeneral}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <h3 className="font-semibold text-slate-900 mb-4">Organization Details</h3>
              <div className="space-y-4">
                <Input
                  id="name"
                  label="Organization name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL slug</label>
                  <p className="text-sm text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded-lg">
                    /{organization.slug}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Slug cannot be changed after creation
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button type="submit" isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h3 className="font-semibold text-red-700 mb-2">Danger Zone</h3>
              <p className="text-sm text-slate-500 mb-4">
                Deleting an organization will remove all associated projects and documents.
                This action cannot be undone.
              </p>
              <Button variant="danger" onClick={handleDeleteOrg}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Invite Form */}
            <form
              onSubmit={handleInvite}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <h3 className="font-semibold text-slate-900 mb-4">Invite Member</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" isLoading={isInviting}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The user must already have an account. If not, they'll need to register first.
              </p>
            </form>

            {/* Members List */}
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Team Members</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {members.map((member) => (
                  <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {member.user.name || 'No name'}
                        </p>
                        <p className="text-sm text-slate-500">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleUpdateRole(member.id, e.target.value as OrganizationRole)
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${getRoleBadgeColor(member.role)}`}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user.email)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Descriptions */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Role Permissions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor('admin')}`}>
                    Admin
                  </span>
                  <span className="text-slate-500">Full access, manage members and settings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor('editor')}`}>
                    Editor
                  </span>
                  <span className="text-slate-500">Create and edit projects and documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor('viewer')}`}>
                    Viewer
                  </span>
                  <span className="text-slate-500">View-only access to projects and documents</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
