import client from './client'
import type {
  SDLCStage,
  SDLCProject,
  SDLCProjectDetail,
  Repository,
  CreateSDLCProjectRequest,
  UpdateSDLCProjectRequest,
  AddRepositoryRequest,
  UpdateRepositoryRequest,
  Document,
  ProjectMember,
  AddProjectMemberRequest,
  UpdateProjectMemberRequest,
} from '@/types'

export const sdlcProjectsApi = {
  // ============ Stages ============

  listStages: async (): Promise<SDLCStage[]> => {
    const response = await client.get<SDLCStage[]>('/sdlc-projects/stages')
    return response.data
  },

  getStage: async (stageId: string): Promise<SDLCStage> => {
    const response = await client.get<SDLCStage>(`/sdlc-projects/stages/${stageId}`)
    return response.data
  },

  // ============ Projects ============

  list: async (organizationId?: string): Promise<SDLCProject[]> => {
    const params = organizationId ? { organization_id: organizationId } : {}
    const response = await client.get<SDLCProject[]>('/sdlc-projects', { params })
    return response.data
  },

  get: async (projectId: string): Promise<SDLCProjectDetail> => {
    const response = await client.get<SDLCProjectDetail>(`/sdlc-projects/${projectId}`)
    return response.data
  },

  create: async (data: CreateSDLCProjectRequest): Promise<SDLCProject> => {
    const response = await client.post<SDLCProject>('/sdlc-projects', data)
    return response.data
  },

  update: async (projectId: string, data: UpdateSDLCProjectRequest): Promise<SDLCProject> => {
    const response = await client.put<SDLCProject>(`/sdlc-projects/${projectId}`, data)
    return response.data
  },

  delete: async (projectId: string): Promise<void> => {
    await client.delete(`/sdlc-projects/${projectId}`)
  },

  // ============ Repositories ============

  listRepositories: async (projectId: string): Promise<Repository[]> => {
    const response = await client.get<Repository[]>(`/sdlc-projects/${projectId}/repositories`)
    return response.data
  },

  addRepository: async (projectId: string, data: AddRepositoryRequest): Promise<Repository> => {
    const response = await client.post<Repository>(`/sdlc-projects/${projectId}/repositories`, data)
    return response.data
  },

  updateRepository: async (
    projectId: string,
    repoId: string,
    data: UpdateRepositoryRequest
  ): Promise<Repository> => {
    const response = await client.put<Repository>(
      `/sdlc-projects/${projectId}/repositories/${repoId}`,
      data
    )
    return response.data
  },

  deleteRepository: async (projectId: string, repoId: string): Promise<void> => {
    await client.delete(`/sdlc-projects/${projectId}/repositories/${repoId}`)
  },

  // ============ Stage Documents ============

  getStageDocuments: async (projectId: string, stageId: string): Promise<Document[]> => {
    const response = await client.get<Document[]>(
      `/sdlc-projects/${projectId}/stages/${stageId}/documents`
    )
    return response.data
  },

  // ============ Project Members ============

  listMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const response = await client.get<ProjectMember[]>(
      `/sdlc-projects/${projectId}/members`
    )
    return response.data
  },

  addMember: async (
    projectId: string,
    data: AddProjectMemberRequest
  ): Promise<ProjectMember> => {
    const response = await client.post<ProjectMember>(
      `/sdlc-projects/${projectId}/members`,
      data
    )
    return response.data
  },

  updateMember: async (
    projectId: string,
    memberId: string,
    data: UpdateProjectMemberRequest
  ): Promise<ProjectMember> => {
    const response = await client.patch<ProjectMember>(
      `/sdlc-projects/${projectId}/members/${memberId}`,
      data
    )
    return response.data
  },

  removeMember: async (projectId: string, memberId: string): Promise<void> => {
    await client.delete(`/sdlc-projects/${projectId}/members/${memberId}`)
  },
}
