import client from './client'
import type {
  Organization,
  OrganizationWithRole,
  OrganizationDetail,
  OrganizationMember,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
} from '@/types'

export const organizationsApi = {
  // Organization CRUD
  list: async (): Promise<OrganizationWithRole[]> => {
    const response = await client.get<OrganizationWithRole[]>('/organizations')
    return response.data
  },

  create: async (data: CreateOrganizationRequest): Promise<Organization> => {
    const response = await client.post<Organization>('/organizations', data)
    return response.data
  },

  get: async (orgId: string): Promise<OrganizationDetail> => {
    const response = await client.get<OrganizationDetail>(`/organizations/${orgId}`)
    return response.data
  },

  update: async (orgId: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await client.put<Organization>(`/organizations/${orgId}`, data)
    return response.data
  },

  delete: async (orgId: string): Promise<void> => {
    await client.delete(`/organizations/${orgId}`)
  },

  // Member management
  listMembers: async (orgId: string): Promise<OrganizationMember[]> => {
    const response = await client.get<OrganizationMember[]>(`/organizations/${orgId}/members`)
    return response.data
  },

  inviteMember: async (orgId: string, data: InviteMemberRequest): Promise<OrganizationMember> => {
    const response = await client.post<OrganizationMember>(`/organizations/${orgId}/members`, data)
    return response.data
  },

  updateMemberRole: async (
    orgId: string,
    memberId: string,
    data: UpdateMemberRoleRequest
  ): Promise<OrganizationMember> => {
    const response = await client.patch<OrganizationMember>(
      `/organizations/${orgId}/members/${memberId}`,
      data
    )
    return response.data
  },

  removeMember: async (orgId: string, memberId: string): Promise<void> => {
    await client.delete(`/organizations/${orgId}/members/${memberId}`)
  },

  leave: async (orgId: string): Promise<void> => {
    await client.post(`/organizations/${orgId}/leave`)
  },

  // Get users not in the organization (for Add Members modal)
  listAvailableUsers: async (
    orgId: string,
    search?: string
  ): Promise<{ id: string; email: string; name: string | null }[]> => {
    const params = search ? { search } : {}
    const response = await client.get(`/organizations/${orgId}/available-users`, { params })
    return response.data
  },

  // Add multiple members at once
  addMembersBulk: async (
    orgId: string,
    data: { user_ids: string[]; roles: { is_owner: boolean; is_editor: boolean; is_reviewer: boolean; is_viewer: boolean } }
  ): Promise<{ added: { id: string; email: string; name: string | null }[]; skipped: string[]; message: string }> => {
    const response = await client.post(`/organizations/${orgId}/members/bulk`, data)
    return response.data
  },

  // ============ Membership Requests ============

  // List all public organizations (for join request)
  listPublicOrganizations: async (): Promise<{ id: string; name: string; slug: string; member_count: number }[]> => {
    const response = await client.get('/organizations/all/public')
    return response.data
  },

  // List current user's membership requests
  listMyMembershipRequests: async (): Promise<{
    id: string
    organization_id: string
    status: string
    organization_name: string
    organization_slug: string
    requested_at: string
  }[]> => {
    const response = await client.get('/organizations/requests/my')
    return response.data
  },

  // Request to join an organization
  requestMembership: async (orgId: string): Promise<void> => {
    await client.post('/organizations/requests', { organization_id: orgId })
  },

  // Cancel a pending membership request
  cancelMembershipRequest: async (requestId: string): Promise<void> => {
    await client.delete(`/organizations/requests/${requestId}`)
  },

  // List membership requests for an org (for owners)
  listOrgMembershipRequests: async (
    orgId: string,
    status?: string
  ): Promise<{
    id: string
    user_id: string
    status: string
    user_email: string
    user_name: string | null
    requested_at: string
  }[]> => {
    const params = status ? { status_filter: status } : {}
    const response = await client.get(`/organizations/${orgId}/requests`, { params })
    return response.data
  },

  // Approve or reject a membership request
  reviewMembershipRequest: async (
    orgId: string,
    requestId: string,
    action: 'approve' | 'reject'
  ): Promise<void> => {
    await client.post(`/organizations/${orgId}/requests/${requestId}/review`, { action })
  },
}
