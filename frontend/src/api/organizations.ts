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
    const response = await client.put<OrganizationMember>(
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
}
