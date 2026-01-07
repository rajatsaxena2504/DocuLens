import api from './client'
import type {
  Connector,
  ConnectorWithConfig,
  ConnectorImport,
  TestConnectionResult,
  CreateConnectorRequest,
  UpdateConnectorRequest,
  ImportContentRequest,
  JiraProject,
  JiraIssue,
  ConfluenceSpace,
  ConfluencePage,
  ExternalContent,
  ConnectorType,
} from '../types'

// ============ Connector CRUD ============

export async function listConnectors(
  orgId: string,
  connectorType?: ConnectorType
): Promise<Connector[]> {
  const params = new URLSearchParams()
  if (connectorType) {
    params.append('connector_type', connectorType)
  }
  const queryString = params.toString()
  const url = `/connectors/organization/${orgId}${queryString ? `?${queryString}` : ''}`
  const response = await api.get<Connector[]>(url)
  return response.data
}

export async function createConnector(
  orgId: string,
  data: CreateConnectorRequest
): Promise<Connector> {
  const response = await api.post<Connector>(`/connectors/organization/${orgId}`, data)
  return response.data
}

export async function getConnector(connectorId: string): Promise<ConnectorWithConfig> {
  const response = await api.get<ConnectorWithConfig>(`/connectors/${connectorId}`)
  return response.data
}

export async function updateConnector(
  connectorId: string,
  data: UpdateConnectorRequest
): Promise<Connector> {
  const response = await api.put<Connector>(`/connectors/${connectorId}`, data)
  return response.data
}

export async function deleteConnector(connectorId: string): Promise<void> {
  await api.delete(`/connectors/${connectorId}`)
}

// ============ Test Connection ============

export async function testConnection(connectorId: string): Promise<TestConnectionResult> {
  const response = await api.post<TestConnectionResult>(`/connectors/${connectorId}/test`)
  return response.data
}

// ============ Jira Content ============

export async function listJiraProjects(connectorId: string): Promise<JiraProject[]> {
  const response = await api.get<JiraProject[]>(`/connectors/${connectorId}/jira/projects`)
  return response.data
}

export async function listJiraIssues(
  connectorId: string,
  projectKey: string,
  search?: string
): Promise<JiraIssue[]> {
  const params = new URLSearchParams()
  if (search) {
    params.append('search', search)
  }
  const queryString = params.toString()
  const url = `/connectors/${connectorId}/jira/projects/${projectKey}/issues${queryString ? `?${queryString}` : ''}`
  const response = await api.get<JiraIssue[]>(url)
  return response.data
}

// ============ Confluence Content ============

export async function listConfluenceSpaces(connectorId: string): Promise<ConfluenceSpace[]> {
  const response = await api.get<ConfluenceSpace[]>(`/connectors/${connectorId}/confluence/spaces`)
  return response.data
}

export async function listConfluencePages(
  connectorId: string,
  spaceKey: string,
  search?: string
): Promise<ConfluencePage[]> {
  const params = new URLSearchParams()
  if (search) {
    params.append('search', search)
  }
  const queryString = params.toString()
  const url = `/connectors/${connectorId}/confluence/spaces/${spaceKey}/pages${queryString ? `?${queryString}` : ''}`
  const response = await api.get<ConfluencePage[]>(url)
  return response.data
}

// ============ Content Fetching & Import ============

export async function fetchContent(
  connectorId: string,
  sourceType: string,
  sourceId: string
): Promise<ExternalContent> {
  const response = await api.get<ExternalContent>(
    `/connectors/${connectorId}/content/${sourceType}/${sourceId}`
  )
  return response.data
}

export async function importContent(
  connectorId: string,
  documentId: string,
  data: ImportContentRequest
): Promise<ConnectorImport> {
  const response = await api.post<ConnectorImport>(
    `/connectors/${connectorId}/import/${documentId}`,
    data
  )
  return response.data
}

// ============ Import History ============

export async function listConnectorImports(connectorId: string): Promise<ConnectorImport[]> {
  const response = await api.get<ConnectorImport[]>(`/connectors/${connectorId}/imports`)
  return response.data
}

export async function listDocumentImports(documentId: string): Promise<ConnectorImport[]> {
  const response = await api.get<ConnectorImport[]>(`/connectors/document/${documentId}/imports`)
  return response.data
}
