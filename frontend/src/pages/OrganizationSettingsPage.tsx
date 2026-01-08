import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  Settings,
  Trash2,
  UserPlus,
  Search,
  Check,
  Pencil,
  Clock,
  CheckCircle,
  XCircle,
  Link2,
} from 'lucide-react'
import { organizationsApi } from '@/api/organizations'
import { useOrganization } from '@/context/OrganizationContext'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import { PageLoading } from '@/components/common/Loading'
import ConfirmModal from '@/components/common/ConfirmModal'
import { RoleBadges } from '@/components/common/RoleBadges'
import ConnectorsPanel from '@/components/settings/ConnectorsPanel'
import toast from 'react-hot-toast'
import type { OrganizationDetail, OrganizationMember, OrganizationRoles } from '@/types'

interface AvailableUser {
  id: string
  email: string
  name: string | null
}

interface MembershipRequest {
  id: string
  user_id: string
  status: string
  user_email: string
  user_name: string | null
  requested_at: string
}

export default function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const { isSuperadmin } = useAuth()
  const { refreshOrganizations, organizations } = useOrganization()

  // Check if user has access (owner or superadmin)
  const currentOrgMembership = organizations.find(o => o.id === orgId)
  const isOwner = currentOrgMembership?.roles.includes('owner') ?? false
  const hasAccess = isSuperadmin || isOwner

  const [organization, setOrganization] = useState<OrganizationDetail | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'requests' | 'connectors'>('general')

  // Form states
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Add Members modal
  const [showAddMembersModal, setShowAddMembersModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [addRoles, setAddRoles] = useState<OrganizationRoles>({
    is_owner: false,
    is_editor: false,
    is_reviewer: false,
    is_viewer: true,
  })
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Edit Roles modal
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null)
  const [editRoles, setEditRoles] = useState<OrganizationRoles>({
    is_owner: false,
    is_editor: false,
    is_reviewer: false,
    is_viewer: true,
  })

  // Confirmation modals
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null)

  // Redirect if user doesn't have access
  useEffect(() => {
    if (!isLoading && organizations.length > 0 && !hasAccess) {
      toast.error('You do not have permission to manage this organization')
      navigate('/organizations')
    }
  }, [hasAccess, isLoading, organizations, navigate])

  useEffect(() => {
    if (orgId) {
      loadOrganization()
      loadMembers()
      loadRequests()
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

  const loadRequests = async () => {
    try {
      const requestsList = await organizationsApi.listOrgMembershipRequests(orgId!, 'pending')
      setRequests(requestsList)
    } catch (error) {
      console.error('Failed to load membership requests:', error)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await organizationsApi.reviewMembershipRequest(orgId!, requestId, 'approve')
      toast.success('Request approved! User is now a member.')
      loadRequests()
      loadMembers()
    } catch (error) {
      toast.error('Failed to approve request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await organizationsApi.reviewMembershipRequest(orgId!, requestId, 'reject')
      toast.success('Request rejected')
      loadRequests()
    } catch (error) {
      toast.error('Failed to reject request')
    }
  }

  const loadAvailableUsers = async (search?: string) => {
    setIsLoadingUsers(true)
    try {
      const users = await organizationsApi.listAvailableUsers(orgId!, search)
      setAvailableUsers(users)
    } catch (error) {
      console.error('Failed to load available users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Filter available users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch) return availableUsers
    const search = userSearch.toLowerCase()
    return availableUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(search) ||
        (user.name && user.name.toLowerCase().includes(search))
    )
  }, [availableUsers, userSearch])

  const handleOpenAddMembers = () => {
    setShowAddMembersModal(true)
    setSelectedUserIds(new Set())
    setAddRoles({ is_owner: false, is_editor: false, is_reviewer: false, is_viewer: true })
    setUserSearch('')
    loadAvailableUsers()
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleAddMembers = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user')
      return
    }

    if (!addRoles.is_owner && !addRoles.is_editor && !addRoles.is_reviewer && !addRoles.is_viewer) {
      toast.error('Please select at least one role')
      return
    }

    setIsAddingMembers(true)
    try {
      const result = await organizationsApi.addMembersBulk(orgId!, {
        user_ids: Array.from(selectedUserIds),
        roles: addRoles,
      })
      toast.success(result.message)
      setShowAddMembersModal(false)
      loadMembers()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to add members'
      toast.error(message)
    } finally {
      setIsAddingMembers(false)
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

  const handleEditMember = (member: OrganizationMember) => {
    setEditingMember(member)
    setEditRoles({
      is_owner: member.roles.includes('owner'),
      is_editor: member.roles.includes('editor'),
      is_reviewer: member.roles.includes('reviewer'),
      is_viewer: member.roles.includes('viewer'),
    })
  }

  const handleUpdateRoles = async () => {
    if (!editingMember) return

    if (!editRoles.is_owner && !editRoles.is_editor && !editRoles.is_reviewer && !editRoles.is_viewer) {
      toast.error('At least one role must be selected')
      return
    }

    try {
      await organizationsApi.updateMemberRole(orgId!, editingMember.id, { roles: editRoles })
      await loadMembers()
      setEditingMember(null)
      toast.success('Roles updated')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to update roles'
      toast.error(message)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      await organizationsApi.removeMember(orgId!, memberToRemove.id)
      await loadMembers()
      toast.success('Member removed')
      setMemberToRemove(null)
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const handleDeleteOrg = async () => {
    setIsDeleting(true)
    try {
      await organizationsApi.delete(orgId!)
      await refreshOrganizations()
      toast.success('Organization deleted')
      navigate('/organizations')
    } catch (error) {
      toast.error('Failed to delete organization')
      setIsDeleting(false)
      setShowDeleteOrgModal(false)
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
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'requests'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            Requests
            {requests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('connectors')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'connectors'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="h-4 w-4" />
            Connectors
          </button>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <form
              onSubmit={handleSaveGeneral}
              className="section-card"
            >
              <h3 className="text-base font-semibold text-slate-900 mb-4">Organization Details</h3>
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
            <div className="bg-white rounded-xl border border-error-200 p-6">
              <h3 className="text-base font-semibold text-error-700 mb-2">Danger Zone</h3>
              <p className="text-sm text-slate-500 mb-4">
                Deleting an organization will remove all associated projects and documents.
                This action cannot be undone.
              </p>
              <Button variant="danger" onClick={() => setShowDeleteOrgModal(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Organization
              </Button>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Header with Add Members button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Team Members</h3>
                <p className="text-sm text-slate-500">Manage who has access to this organization</p>
              </div>
              <Button onClick={handleOpenAddMembers}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No members yet</h3>
                  <p className="text-slate-500 mb-4">Add team members to collaborate on this organization</p>
                  <Button onClick={handleOpenAddMembers}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Members
                  </Button>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {(member.user?.name || member.user?.email || member.user_email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {member.user?.name || member.user_name || 'No name'}
                        </p>
                        <p className="text-sm text-slate-500">{member.user?.email || member.user_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEditMember(member)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        title="Click to edit roles"
                      >
                        <RoleBadges roles={member.roles} maxDisplay={4} size="sm" />
                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => setMemberToRemove({ id: member.id, email: member.user?.email || member.user_email || '' })}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Role Descriptions */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Role Permissions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 shrink-0">
                    Owner
                  </span>
                  <span className="text-slate-500">Full access, manage members and settings</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                    Editor
                  </span>
                  <span className="text-slate-500">Create and edit projects and documents</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 shrink-0">
                    Reviewer
                  </span>
                  <span className="text-slate-500">Approve/reject documents, add comments</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 shrink-0">
                    Viewer
                  </span>
                  <span className="text-slate-500">View-only access to projects and documents</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900">Membership Requests</h3>
              <p className="text-sm text-slate-500">Review and approve requests to join this organization</p>
            </div>

            {requests.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No pending requests</h3>
                <p className="text-slate-500">
                  When users request to join this organization, they'll appear here for approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-amber-700">
                          {(request.user_name || request.user_email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {request.user_name || 'No name'}
                        </p>
                        <p className="text-sm text-slate-500">{request.user_email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Requested {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">About Membership Requests</h4>
              <p className="text-sm text-slate-500">
                When you approve a request, the user will be added to this organization with the <strong>Viewer</strong> role.
                You can change their roles in the Members tab after approval.
              </p>
            </div>
          </div>
        )}

        {/* Connectors Tab */}
        {activeTab === 'connectors' && orgId && (
          <ConnectorsPanel organizationId={orgId} isOwner={isOwner} />
        )}
      </div>

      {/* Add Members Modal */}
      <Modal
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        title="Add Members"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Select users to add to this organization and assign their roles.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* User List */}
          <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
            {isLoadingUsers ? (
              <div className="p-8 text-center text-slate-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {userSearch ? 'No users found matching your search' : 'No available users to add'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedUserIds.has(user.id) ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedUserIds.has(user.id)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedUserIds.has(user.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{user.name || 'No name'}</p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedUserIds.size > 0 && (
            <p className="text-sm text-primary-600 font-medium">
              {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
            </p>
          )}

          {/* Role Selection */}
          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Assign roles to selected users
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={addRoles.is_owner}
                  onChange={(e) => setAddRoles({ ...addRoles, is_owner: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Owner</span>
                  <p className="text-xs text-slate-500">Full access</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={addRoles.is_editor}
                  onChange={(e) => setAddRoles({ ...addRoles, is_editor: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Editor</span>
                  <p className="text-xs text-slate-500">Create & edit</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={addRoles.is_reviewer}
                  onChange={(e) => setAddRoles({ ...addRoles, is_reviewer: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Reviewer</span>
                  <p className="text-xs text-slate-500">Approve docs</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={addRoles.is_viewer}
                  onChange={(e) => setAddRoles({ ...addRoles, is_viewer: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Viewer</span>
                  <p className="text-xs text-slate-500">Read-only</p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddMembersModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              isLoading={isAddingMembers}
              disabled={selectedUserIds.size === 0}
            >
              Add {selectedUserIds.size > 0 ? `${selectedUserIds.size} Member${selectedUserIds.size > 1 ? 's' : ''}` : 'Members'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Roles Modal */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title="Edit Roles"
        size="md"
      >
        {editingMember && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Update roles for{' '}
              <span className="font-medium text-slate-900">
                {editingMember.user?.name || editingMember.user_name || editingMember.user?.email || editingMember.user_email}
              </span>
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editRoles.is_owner}
                  onChange={(e) => setEditRoles({ ...editRoles, is_owner: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Owner</span>
                  <p className="text-xs text-slate-500">Full access, manage members and settings</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editRoles.is_editor}
                  onChange={(e) => setEditRoles({ ...editRoles, is_editor: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Editor</span>
                  <p className="text-xs text-slate-500">Create and edit projects and documents</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editRoles.is_reviewer}
                  onChange={(e) => setEditRoles({ ...editRoles, is_reviewer: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Reviewer</span>
                  <p className="text-xs text-slate-500">Approve/reject documents, add review comments</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editRoles.is_viewer}
                  onChange={(e) => setEditRoles({ ...editRoles, is_viewer: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-slate-900">Viewer</span>
                  <p className="text-xs text-slate-500">View-only access to projects and documents</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRoles}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Organization Modal */}
      <ConfirmModal
        isOpen={showDeleteOrgModal}
        onClose={() => setShowDeleteOrgModal(false)}
        onConfirm={handleDeleteOrg}
        title="Delete Organization"
        message={
          <div>
            <p>Are you sure you want to delete <strong>{organization.name}</strong>?</p>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete all projects, documents, and data associated with this organization.
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete Organization"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Remove Member Modal */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={
          <p>
            Are you sure you want to remove <strong>{memberToRemove?.email}</strong> from this organization?
          </p>
        }
        confirmText="Remove Member"
        variant="danger"
      />
    </Layout>
  )
}
