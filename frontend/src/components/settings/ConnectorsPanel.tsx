import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Plus,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react'
import { useConnectors, useCreateConnector, useDeleteConnector } from '../../hooks/useConnectors'
import { testConnection } from '../../api/connectors'
import Button from '../common/Button'
import ConfirmModal from '../common/ConfirmModal'
import type { Connector, ConnectorType } from '../../types'
import toast from 'react-hot-toast'

interface ConnectorsPanelProps {
  organizationId: string
  isOwner: boolean
}

const CONNECTOR_INFO: Record<ConnectorType, { name: string; icon: string; description: string }> = {
  jira: {
    name: 'Jira',
    icon: '🎫',
    description: 'Import issues and user stories from Jira',
  },
  confluence: {
    name: 'Confluence',
    icon: '📄',
    description: 'Import pages and documentation from Confluence',
  },
  miro: {
    name: 'Miro',
    icon: '🎨',
    description: 'Import board content and diagrams from Miro',
  },
  sharepoint: {
    name: 'SharePoint',
    icon: '📁',
    description: 'Import documents and files from SharePoint',
  },
}

export default function ConnectorsPanel({ organizationId, isOwner }: ConnectorsPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const [connectorToDelete, setConnectorToDelete] = useState<{ id: string; name: string } | null>(null)

  const { data: connectors, isLoading } = useConnectors(organizationId)
  const deleteConnector = useDeleteConnector()

  const handleTest = async (connector: Connector) => {
    setTestingId(connector.id)
    setTestResult(null)
    try {
      const result = await testConnection(connector.id)
      setTestResult({ id: connector.id, success: result.success, message: result.message })
      if (result.success) {
        toast.success('Connection successful!')
      } else {
        toast.error(result.message || 'Connection test failed')
      }
    } catch {
      setTestResult({ id: connector.id, success: false, message: 'Connection test failed' })
      toast.error('Connection test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async () => {
    if (!connectorToDelete) return
    try {
      await deleteConnector.mutateAsync(connectorToDelete.id)
      toast.success('Connector deleted')
      setConnectorToDelete(null)
    } catch {
      toast.error('Failed to delete connector')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">External Connectors</h3>
          <p className="text-sm text-slate-500">
            Connect external services to import content directly into your documents.
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Connector
          </Button>
        )}
      </div>

      {connectors && connectors.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <Link2 className="mx-auto h-12 w-12 text-slate-300" />
          <h4 className="mt-4 font-medium text-slate-900">No connectors configured</h4>
          <p className="mt-2 text-sm text-slate-500">
            Connect external services like Jira, Confluence, or SharePoint to import content.
          </p>
          {isOwner && (
            <Button onClick={() => setShowAddModal(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add your first connector
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {connectors?.map((connector) => {
            const info = CONNECTOR_INFO[connector.type]
            const isTestingThis = testingId === connector.id
            const thisTestResult = testResult?.id === connector.id ? testResult : null

            return (
              <motion.div
                key={connector.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{info?.icon || '🔗'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{connector.name}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {info?.name || connector.type}
                      </span>
                      {!connector.is_active && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    {connector.last_used_at && (
                      <p className="text-xs text-slate-500">
                        Last used: {new Date(connector.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {thisTestResult && (
                    <span className={`flex items-center gap-1 text-sm ${thisTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {thisTestResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {thisTestResult.success ? 'Connected' : 'Failed'}
                    </span>
                  )}

                  <button
                    onClick={() => handleTest(connector)}
                    disabled={isTestingThis}
                    className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 transition-colors"
                    title="Test connection"
                  >
                    {isTestingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </button>

                  {isOwner && (
                    <>
                      <button
                        onClick={() => {/* TODO: Open edit modal */}}
                        className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConnectorToDelete({ id: connector.id, name: connector.name })}
                        className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Available Integrations Info */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Available Integrations</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {(Object.entries(CONNECTOR_INFO) as [ConnectorType, typeof CONNECTOR_INFO[ConnectorType]][]).map(
            ([type, info]) => (
              <div key={type} className="flex items-start gap-2">
                <span className="text-lg">{info.icon}</span>
                <div>
                  <span className="font-medium text-slate-700">{info.name}</span>
                  <p className="text-xs text-slate-500">{info.description}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Add Connector Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddConnectorModal
            organizationId={organizationId}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!connectorToDelete}
        onClose={() => setConnectorToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Connector"
        message={
          <p>
            Are you sure you want to delete <strong>{connectorToDelete?.name}</strong>?
            This will remove the connection and cannot be undone.
          </p>
        }
        confirmText="Delete Connector"
        variant="danger"
        isLoading={deleteConnector.isPending}
      />
    </div>
  )
}

// ============ Add Connector Modal ============

interface AddConnectorModalProps {
  organizationId: string
  onClose: () => void
}

function AddConnectorModal({ organizationId, onClose }: AddConnectorModalProps) {
  const [step, setStep] = useState<'select' | 'configure'>('select')
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})

  const createConnector = useCreateConnector(organizationId)

  const handleSubmit = async () => {
    if (!selectedType || !name) return

    try {
      await createConnector.mutateAsync({
        type: selectedType,
        name,
        config,
      })
      toast.success('Connector created successfully')
      onClose()
    } catch {
      toast.error('Failed to create connector')
    }
  }

  const getConfigFields = (type: ConnectorType): { key: string; label: string; type: string; placeholder?: string }[] => {
    switch (type) {
      case 'jira':
      case 'confluence':
        return [
          { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://your-domain.atlassian.net' },
          { key: 'email', label: 'Email', type: 'email', placeholder: 'your-email@company.com' },
          { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'Your Atlassian API token' },
        ]
      case 'miro':
        return [
          { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Your Miro access token' },
        ]
      case 'sharepoint':
        return [
          { key: 'site_url', label: 'Site URL', type: 'url', placeholder: 'https://your-org.sharepoint.com/sites/...' },
          { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Azure AD application client ID' },
          { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Azure AD application secret' },
        ]
      default:
        return []
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-semibold text-slate-900">Add Connector</h3>

        {step === 'select' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-500">Select a service to connect:</p>
            {(Object.entries(CONNECTOR_INFO) as [ConnectorType, typeof CONNECTOR_INFO[ConnectorType]][]).map(
              ([type, info]) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type)
                    setName(`${info.name} Connector`)
                    setStep('configure')
                  }}
                  className="flex w-full items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <span className="font-medium text-slate-900">{info.name}</span>
                    <p className="text-sm text-slate-500">{info.description}</p>
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Connector Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {selectedType && getConfigFields(selectedType).map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={config[field.key] || ''}
                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name || createConnector.isPending}
                isLoading={createConnector.isPending}
              >
                Create Connector
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
