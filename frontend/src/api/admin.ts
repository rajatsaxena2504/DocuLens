import client from './client'
import type {
  AdminUserResponse,
  AdminOrganizationResponse,
  CreateOrganizationWithOwnerRequest,
  GrantSuperadminRequest,
} from '@/types'

export const adminApi = {
  // User management (superadmin only)
  listUsers: async (): Promise<AdminUserResponse[]> => {
    const response = await client.get<AdminUserResponse[]>('/admin/users')
    return response.data
  },

  grantSuperadmin: async (userId: string): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(`/admin/users/${userId}/superadmin`)
    return response.data
  },

  grantSuperadminByEmail: async (data: GrantSuperadminRequest): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>('/admin/users/superadmin', data)
    return response.data
  },

  revokeSuperadmin: async (userId: string): Promise<{ message: string }> => {
    const response = await client.delete<{ message: string }>(`/admin/users/${userId}/superadmin`)
    return response.data
  },

  // Organization management (superadmin only)
  listOrganizations: async (): Promise<AdminOrganizationResponse[]> => {
    const response = await client.get<AdminOrganizationResponse[]>('/admin/organizations')
    return response.data
  },

  createOrganizationWithOwner: async (
    data: CreateOrganizationWithOwnerRequest
  ): Promise<AdminOrganizationResponse> => {
    const response = await client.post<AdminOrganizationResponse>('/admin/organizations', data)
    return response.data
  },

  deleteOrganization: async (orgId: string): Promise<void> => {
    await client.delete(`/admin/organizations/${orgId}`)
  },
}
