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
} from 'lucide-react'
import { useConnectors, useCreateConnector, useDeleteConnector } from '../../hooks/useConnectors'
import type { Connector, ConnectorType } from '../../types'

interface ConnectorsPanelProps {
  organizationId: string
  isAdmin: boolean
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

export default function ConnectorsPanel({ organizationId, isAdmin }: ConnectorsPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)

  const { data: connectors, isLoading } = useConnectors(organizationId)
  const deleteConnector = useDeleteConnector()

  const handleTest = async (connector: Connector) => {
    setTestingId(connector.id)
    setTestResult(null)
    try {
      // We'll use a direct fetch for now since useTestConnection is a hook
      const response = await fetch(`/api/connectors/${connector.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      setTestResult({ id: connector.id, success: result.success, message: result.message })
    } catch {
      setTestResult({ id: connector.id, success: false, message: 'Connection test failed' })
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (connectorId: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return
    deleteConnector.mutate(connectorId)
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
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-slate-400" />
          <h3 className="font-medium text-slate-200">External Connectors</h3>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Connector
          </button>
        )}
      </div>

      <p className="text-sm text-slate-400">
        Connect external services to import content directly into your documents.
      </p>

      {connectors && connectors.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
          <Link2 className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-slate-400">No connectors configured</p>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-emerald-400 hover:text-emerald-300"
            >
              Add your first connector
            </button>
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
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{info?.icon || '🔗'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">{connector.name}</span>
                      <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                        {info?.name || connector.type}
                      </span>
                      {!connector.is_active && (
                        <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-400">
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
                    <span className={`flex items-center gap-1 text-sm ${thisTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {thisTestResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {thisTestResult.message}
                    </span>
                  )}

                  <button
                    onClick={() => handleTest(connector)}
                    disabled={isTestingThis}
                    className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-50"
                    title="Test connection"
                  >
                    {isTestingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {/* TODO: Open edit modal */}}
                        className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        title="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(connector.id)}
                        className="rounded p-2 text-slate-400 hover:bg-red-900/50 hover:text-red-400"
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

      <AnimatePresence>
        {showAddModal && (
          <AddConnectorModal
            organizationId={organizationId}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
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
      onClose()
    } catch (err) {
      console.error('Failed to create connector:', err)
    }
  }

  const getConfigFields = (type: ConnectorType): { key: string; label: string; type: string }[] => {
    switch (type) {
      case 'jira':
      case 'confluence':
        return [
          { key: 'base_url', label: 'Base URL', type: 'url' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'api_token', label: 'API Token', type: 'password' },
        ]
      case 'miro':
        return [
          { key: 'access_token', label: 'Access Token', type: 'password' },
        ]
      case 'sharepoint':
        return [
          { key: 'site_url', label: 'Site URL', type: 'url' },
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-slate-200">Add Connector</h3>

        {step === 'select' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-400">Select a service to connect:</p>
            {(Object.entries(CONNECTOR_INFO) as [ConnectorType, typeof CONNECTOR_INFO[ConnectorType]][]).map(
              ([type, info]) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type)
                    setName(`${info.name} Connector`)
                    setStep('configure')
                  }}
                  className="flex w-full items-center gap-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-left hover:border-emerald-500/50 hover:bg-slate-900"
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <span className="font-medium text-slate-200">{info.name}</span>
                    <p className="text-sm text-slate-400">{info.description}</p>
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Connector Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {selectedType && getConfigFields(selectedType).map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-300">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={config[field.key] || ''}
                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setStep('select')}
                className="rounded-lg px-4 py-2 text-slate-300 hover:bg-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name || createConnector.isPending}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {createConnector.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Connector
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
        >
          ×
        </button>
      </motion.div>
    </motion.div>
  )
}
