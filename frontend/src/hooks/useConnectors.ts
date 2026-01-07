import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listConnectors,
  createConnector,
  getConnector,
  updateConnector,
  deleteConnector,
  testConnection,
  listJiraProjects,
  listJiraIssues,
  listConfluenceSpaces,
  listConfluencePages,
  fetchContent,
  importContent,
  listConnectorImports,
  listDocumentImports,
} from '../api/connectors'
import type {
  CreateConnectorRequest,
  UpdateConnectorRequest,
  ImportContentRequest,
  ConnectorType,
} from '../types'

// ============ Query Keys ============

export const connectorKeys = {
  all: ['connectors'] as const,
  list: (orgId: string, type?: ConnectorType) =>
    [...connectorKeys.all, 'list', orgId, type] as const,
  detail: (id: string) => [...connectorKeys.all, 'detail', id] as const,
  test: (id: string) => [...connectorKeys.all, 'test', id] as const,
  jiraProjects: (id: string) => [...connectorKeys.all, 'jira', 'projects', id] as const,
  jiraIssues: (id: string, projectKey: string, search?: string) =>
    [...connectorKeys.all, 'jira', 'issues', id, projectKey, search] as const,
  confluenceSpaces: (id: string) => [...connectorKeys.all, 'confluence', 'spaces', id] as const,
  confluencePages: (id: string, spaceKey: string, search?: string) =>
    [...connectorKeys.all, 'confluence', 'pages', id, spaceKey, search] as const,
  content: (id: string, sourceType: string, sourceId: string) =>
    [...connectorKeys.all, 'content', id, sourceType, sourceId] as const,
  imports: (id: string) => [...connectorKeys.all, 'imports', id] as const,
  documentImports: (docId: string) => [...connectorKeys.all, 'documentImports', docId] as const,
}

// ============ Connector Queries ============

export function useConnectors(orgId: string, connectorType?: ConnectorType) {
  return useQuery({
    queryKey: connectorKeys.list(orgId, connectorType),
    queryFn: () => listConnectors(orgId, connectorType),
    enabled: !!orgId,
  })
}

export function useConnector(connectorId: string) {
  return useQuery({
    queryKey: connectorKeys.detail(connectorId),
    queryFn: () => getConnector(connectorId),
    enabled: !!connectorId,
  })
}

// ============ Connector Mutations ============

export function useCreateConnector(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateConnectorRequest) => createConnector(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.list(orgId) })
    },
  })
}

export function useUpdateConnector(connectorId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateConnectorRequest) => updateConnector(connectorId, data),
    onSuccess: (updatedConnector) => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.detail(connectorId) })
      queryClient.invalidateQueries({
        queryKey: connectorKeys.list(updatedConnector.organization_id)
      })
    },
  })
}

export function useDeleteConnector() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectorId: string) => deleteConnector(connectorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.all })
    },
  })
}

// ============ Test Connection ============

export function useTestConnection(connectorId: string) {
  return useMutation({
    mutationFn: () => testConnection(connectorId),
  })
}

// ============ Jira Queries ============

export function useJiraProjects(connectorId: string, enabled = true) {
  return useQuery({
    queryKey: connectorKeys.jiraProjects(connectorId),
    queryFn: () => listJiraProjects(connectorId),
    enabled: enabled && !!connectorId,
  })
}

export function useJiraIssues(
  connectorId: string,
  projectKey: string,
  search?: string,
  enabled = true
) {
  return useQuery({
    queryKey: connectorKeys.jiraIssues(connectorId, projectKey, search),
    queryFn: () => listJiraIssues(connectorId, projectKey, search),
    enabled: enabled && !!connectorId && !!projectKey,
  })
}

// ============ Confluence Queries ============

export function useConfluenceSpaces(connectorId: string, enabled = true) {
  return useQuery({
    queryKey: connectorKeys.confluenceSpaces(connectorId),
    queryFn: () => listConfluenceSpaces(connectorId),
    enabled: enabled && !!connectorId,
  })
}

export function useConfluencePages(
  connectorId: string,
  spaceKey: string,
  search?: string,
  enabled = true
) {
  return useQuery({
    queryKey: connectorKeys.confluencePages(connectorId, spaceKey, search),
    queryFn: () => listConfluencePages(connectorId, spaceKey, search),
    enabled: enabled && !!connectorId && !!spaceKey,
  })
}

// ============ Content Fetching ============

export function useExternalContent(
  connectorId: string,
  sourceType: string,
  sourceId: string,
  enabled = true
) {
  return useQuery({
    queryKey: connectorKeys.content(connectorId, sourceType, sourceId),
    queryFn: () => fetchContent(connectorId, sourceType, sourceId),
    enabled: enabled && !!connectorId && !!sourceType && !!sourceId,
  })
}

// ============ Import Mutations ============

export function useImportContent(connectorId: string, documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ImportContentRequest) => importContent(connectorId, documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectorKeys.imports(connectorId) })
      queryClient.invalidateQueries({ queryKey: connectorKeys.documentImports(documentId) })
    },
  })
}

// ============ Import History ============

export function useConnectorImports(connectorId: string) {
  return useQuery({
    queryKey: connectorKeys.imports(connectorId),
    queryFn: () => listConnectorImports(connectorId),
    enabled: !!connectorId,
  })
}

export function useDocumentImports(documentId: string) {
  return useQuery({
    queryKey: connectorKeys.documentImports(documentId),
    queryFn: () => listDocumentImports(documentId),
    enabled: !!documentId,
  })
}
