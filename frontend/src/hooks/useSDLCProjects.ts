import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdlcProjectsApi } from '@/api/sdlcProjects'
import type {
  CreateSDLCProjectRequest,
  UpdateSDLCProjectRequest,
  AddRepositoryRequest,
  UpdateRepositoryRequest,
} from '@/types'

// ============ Query Keys ============

export const sdlcQueryKeys = {
  stages: ['sdlc-stages'] as const,
  stage: (id: string) => ['sdlc-stages', id] as const,
  projects: ['sdlc-projects'] as const,
  project: (id: string) => ['sdlc-projects', id] as const,
  repositories: (projectId: string) => ['sdlc-projects', projectId, 'repositories'] as const,
  stageDocuments: (projectId: string, stageId: string) =>
    ['sdlc-projects', projectId, 'stages', stageId, 'documents'] as const,
}

// ============ Stage Hooks ============

export function useSDLCStages() {
  return useQuery({
    queryKey: sdlcQueryKeys.stages,
    queryFn: sdlcProjectsApi.listStages,
    staleTime: Infinity, // Stages don't change
  })
}

export function useSDLCStage(stageId: string) {
  return useQuery({
    queryKey: sdlcQueryKeys.stage(stageId),
    queryFn: () => sdlcProjectsApi.getStage(stageId),
    enabled: !!stageId,
    staleTime: Infinity,
  })
}

// ============ Project Hooks ============

export function useSDLCProjects() {
  return useQuery({
    queryKey: sdlcQueryKeys.projects,
    queryFn: sdlcProjectsApi.list,
  })
}

export function useSDLCProject(projectId: string) {
  return useQuery({
    queryKey: sdlcQueryKeys.project(projectId),
    queryFn: () => sdlcProjectsApi.get(projectId),
    enabled: !!projectId,
  })
}

export function useCreateSDLCProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSDLCProjectRequest) => sdlcProjectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.projects })
    },
  })
}

export function useUpdateSDLCProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateSDLCProjectRequest }) =>
      sdlcProjectsApi.update(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.projects })
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.project(projectId) })
    },
  })
}

export function useDeleteSDLCProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => sdlcProjectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.projects })
    },
  })
}

// ============ Repository Hooks ============

export function useRepositories(projectId: string) {
  return useQuery({
    queryKey: sdlcQueryKeys.repositories(projectId),
    queryFn: () => sdlcProjectsApi.listRepositories(projectId),
    enabled: !!projectId,
  })
}

export function useAddRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: AddRepositoryRequest }) =>
      sdlcProjectsApi.addRepository(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.repositories(projectId) })
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.project(projectId) })
    },
  })
}

export function useUpdateRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      repoId,
      data,
    }: {
      projectId: string
      repoId: string
      data: UpdateRepositoryRequest
    }) => sdlcProjectsApi.updateRepository(projectId, repoId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.repositories(projectId) })
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.project(projectId) })
    },
  })
}

export function useDeleteRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, repoId }: { projectId: string; repoId: string }) =>
      sdlcProjectsApi.deleteRepository(projectId, repoId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.repositories(projectId) })
      queryClient.invalidateQueries({ queryKey: sdlcQueryKeys.project(projectId) })
    },
  })
}

// ============ Stage Documents Hook ============

export function useStageDocuments(projectId: string, stageId: string) {
  return useQuery({
    queryKey: sdlcQueryKeys.stageDocuments(projectId, stageId),
    queryFn: () => sdlcProjectsApi.getStageDocuments(projectId, stageId),
    enabled: !!projectId && !!stageId,
  })
}
