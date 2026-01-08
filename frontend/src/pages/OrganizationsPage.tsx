import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Plus, FolderOpen, Settings, ChevronRight, Clock, UserPlus } from 'lucide-react'
import { organizationsApi } from '@/api/organizations'
import { useOrganization } from '@/context/OrganizationContext'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { PageLoading } from '@/components/common/Loading'
import { RoleBadges } from '@/components/common/RoleBadges'
import toast from 'react-hot-toast'
import type { OrganizationWithRole, OrganizationRole } from '@/types'

interface PublicOrg {
  id: string
  name: string
  slug: string
  member_count: number
}

interface MembershipRequest {
  id: string
  organization_id: string
  status: string
  organization_name: string
  organization_slug: string
  requested_at: string
}

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const { switchOrg } = useOrganization()
  const { isSuperadmin } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Join org modal
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [publicOrgs, setPublicOrgs] = useState<PublicOrg[]>([])
  const [myRequests, setMyRequests] = useState<MembershipRequest[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    loadOrganizations()
    loadMyRequests()
  }, [])

  const loadOrganizations = async () => {
    try {
      const orgs = await organizationsApi.list()
      setOrganizations(orgs)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMyRequests = async () => {
    try {
      const requests = await organizationsApi.listMyMembershipRequests()
      setMyRequests(requests)
    } catch (error) {
      console.error('Failed to load membership requests:', error)
    }
  }

  const loadPublicOrgs = async () => {
    try {
      const orgs = await organizationsApi.listPublicOrganizations()
      // Filter out orgs user is already a member of or has pending request for
      const memberOrgIds = new Set(organizations.map(o => o.id))
      const pendingOrgIds = new Set(myRequests.filter(r => r.status === 'pending').map(r => r.organization_id))
      const filteredOrgs = orgs.filter(o => !memberOrgIds.has(o.id) && !pendingOrgIds.has(o.id))
      setPublicOrgs(filteredOrgs)
    } catch (error) {
      console.error('Failed to load public organizations:', error)
    }
  }

  const handleOpenJoinModal = async () => {
    setShowJoinModal(true)
    setSelectedOrgId('')
    await loadPublicOrgs()
  }

  const handleRequestJoin = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization')
      return
    }

    setIsRequesting(true)
    try {
      await organizationsApi.requestMembership(selectedOrgId)
      toast.success('Request sent! Waiting for approval.')
      setShowJoinModal(false)
      loadMyRequests()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to send request')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    try {
      await organizationsApi.cancelMembershipRequest(requestId)
      toast.success('Request cancelled')
      loadMyRequests()
    } catch (error) {
      toast.error('Failed to cancel request')
    }
  }

  const handleSelectOrg = (org: OrganizationWithRole) => {
    switchOrg(org.id)
    navigate('/projects')
  }

  const pendingRequests = myRequests.filter(r => r.status === 'pending')

  if (isLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your teams and collaborate on documentation projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleOpenJoinModal}>
              <UserPlus className="h-4 w-4 mr-2" />
              Request to Join
            </Button>
            {isSuperadmin && (
              <Link to="/organizations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Organization
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests
            </h3>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                  <div>
                    <span className="font-medium text-slate-900">{req.organization_name}</span>
                    <span className="text-slate-500 ml-2">/{req.organization_slug}</span>
                  </div>
                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    className="text-sm text-amber-700 hover:text-amber-900"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No organizations yet</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              {isSuperadmin
                ? 'Create an organization to collaborate with your team on documentation projects.'
                : 'Request to join an organization to start collaborating on documentation projects.'}
            </p>
            {isSuperadmin ? (
              <Link to="/organizations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first organization
                </Button>
              </Link>
            ) : (
              <Button onClick={handleOpenJoinModal}>
                <UserPlus className="h-4 w-4 mr-2" />
                Request to Join an Organization
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-slate-900">{org.name}</h3>
                        <RoleBadges roles={org.roles as OrganizationRole[]} size="sm" />
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">/{org.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(isSuperadmin || org.roles.includes('owner')) && (
                      <Link
                        to={`/organizations/${org.id}/settings`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleSelectOrg(org)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-all duration-200"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-sm font-medium">View Projects</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request to Join Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Request to Join Organization"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Select an organization to request membership. The organization owner will review your request.
          </p>

          {publicOrgs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No organizations available to join.</p>
              <p className="text-sm mt-1">You may have already requested to join all available organizations.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {publicOrgs.map((org) => (
                <label
                  key={org.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOrgId === org.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="org"
                    value={org.id}
                    checked={selectedOrgId === org.id}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="sr-only"
                  />
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{org.name}</p>
                    <p className="text-sm text-slate-500">/{org.slug} • {org.member_count} members</p>
                  </div>
                  {selectedOrgId === org.id && (
                    <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestJoin}
              isLoading={isRequesting}
              disabled={!selectedOrgId || publicOrgs.length === 0}
            >
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
