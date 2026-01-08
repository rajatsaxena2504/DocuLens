import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Download,
  FileText,
  Key,
  ArrowRight,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import {
  useSTTMMappings,
  useSTTMSummary,
  useCreateSTTMMapping,
  useDeleteSTTMMapping,
  useDeleteAllSTTMMappings,
  useGenerateSTTMDoc,
} from '../../hooks/useSTTM'
import { getExportUrl } from '../../api/sttm'
import Button from '../common/Button'
import ConfirmModal from '../common/ConfirmModal'
import type { STTMMapping, CreateSTTMMappingRequest, TransformationType } from '../../types'
import toast from 'react-hot-toast'

interface STTMEditorProps {
  documentId: string
  readOnly?: boolean
}

const TRANSFORMATION_TYPES: { value: TransformationType; label: string; color: string }[] = [
  { value: 'direct', label: 'Direct', color: 'bg-green-500' },
  { value: 'derived', label: 'Derived', color: 'bg-blue-500' },
  { value: 'constant', label: 'Constant', color: 'bg-purple-500' },
  { value: 'lookup', label: 'Lookup', color: 'bg-amber-500' },
  { value: 'aggregate', label: 'Aggregate', color: 'bg-rose-500' },
  { value: 'conditional', label: 'Conditional', color: 'bg-cyan-500' },
]

export default function STTMEditor({ documentId, readOnly = false }: STTMEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null)
  const [mappingToDelete, setMappingToDelete] = useState<{ id: string; name: string } | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)

  const { data: mappings, isLoading } = useSTTMMappings(documentId)
  const { data: summary } = useSTTMSummary(documentId)

  const createMapping = useCreateSTTMMapping(documentId)
  const deleteMapping = useDeleteSTTMMapping(documentId)
  const deleteAll = useDeleteAllSTTMMappings(documentId)
  const generateDoc = useGenerateSTTMDoc(documentId)

  const handleCreate = useCallback(async (data: CreateSTTMMappingRequest) => {
    await createMapping.mutateAsync(data)
    toast.success('Mapping created')
    setShowAddForm(false)
  }, [createMapping])

  const handleDelete = useCallback(async () => {
    if (!mappingToDelete) return
    await deleteMapping.mutateAsync(mappingToDelete.id)
    toast.success('Mapping deleted')
    setMappingToDelete(null)
  }, [deleteMapping, mappingToDelete])

  const handleDeleteAll = useCallback(async () => {
    await deleteAll.mutateAsync()
    toast.success('All mappings deleted')
    setShowDeleteAllModal(false)
  }, [deleteAll])

  const handleGenerateDoc = useCallback(async () => {
    const result = await generateDoc.mutateAsync({})
    setGeneratedDoc(result.content)
    toast.success('Documentation generated')
  }, [generateDoc])

  const handleExport = useCallback(() => {
    window.open(getExportUrl(documentId), '_blank')
  }, [documentId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Source to Target Mapping</h2>
          {summary && (
            <p className="text-sm text-slate-500">
              {summary.total_mappings} mappings • {summary.source_systems.length} source systems • {summary.target_systems.length} target systems
            </p>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDoc}
              isLoading={generateDoc.isPending}
              leftIcon={<FileText className="h-4 w-4" />}
            >
              Generate Doc
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Mapping
            </Button>
          </div>
        )}
      </div>

      {/* Generated Doc Preview */}
      <AnimatePresence>
        {generatedDoc && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Generated Documentation</h3>
              <button
                onClick={() => setGeneratedDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-4 text-sm text-slate-700 border border-slate-200">
              {generatedDoc}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <MappingForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={createMapping.isPending}
          />
        )}
      </AnimatePresence>

      {/* Mappings Table */}
      {mappings && mappings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <ArrowRight className="mx-auto h-12 w-12 text-slate-300" />
          <h4 className="mt-4 font-medium text-slate-900">No mappings defined</h4>
          <p className="mt-2 text-sm text-slate-500">
            Define source-to-target mappings for your ETL/data pipeline documentation.
          </p>
          {!readOnly && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="mt-4"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add your first mapping
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <div className="col-span-1"></div>
            <div className="col-span-3">Source</div>
            <div className="col-span-1 text-center"></div>
            <div className="col-span-3">Target</div>
            <div className="col-span-2">Transform</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {mappings?.map((mapping) => (
              <MappingRow
                key={mapping.id}
                mapping={mapping}
                isExpanded={expandedId === mapping.id}
                readOnly={readOnly}
                onDelete={() => setMappingToDelete({
                  id: mapping.id,
                  name: `${mapping.source_table}.${mapping.source_column} → ${mapping.target_table}.${mapping.target_column}`
                })}
                onToggleExpand={() => setExpandedId(expandedId === mapping.id ? null : mapping.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete All */}
      {!readOnly && mappings && mappings.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete All Mappings
          </button>
        </div>
      )}

      {/* Delete Single Mapping Modal */}
      <ConfirmModal
        isOpen={!!mappingToDelete}
        onClose={() => setMappingToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Mapping"
        message={
          <p>
            Are you sure you want to delete the mapping <strong>{mappingToDelete?.name}</strong>?
          </p>
        }
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMapping.isPending}
      />

      {/* Delete All Mappings Modal */}
      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Mappings"
        message={
          <p>
            Are you sure you want to delete <strong>ALL</strong> mappings? This action cannot be undone.
          </p>
        }
        confirmText="Delete All"
        variant="danger"
        isLoading={deleteAll.isPending}
      />
    </div>
  )
}

// ============ Mapping Row ============

interface MappingRowProps {
  mapping: STTMMapping
  isExpanded: boolean
  readOnly: boolean
  onDelete: () => void
  onToggleExpand: () => void
}

function MappingRow({
  mapping,
  isExpanded,
  readOnly,
  onDelete,
  onToggleExpand,
}: MappingRowProps) {
  const transformType = TRANSFORMATION_TYPES.find(t => t.value === mapping.transformation_type)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white hover:bg-slate-50/50 transition-colors"
    >
      <div className="grid grid-cols-12 items-center gap-2 px-4 py-3">
        {/* Drag Handle & Key Indicator */}
        <div className="col-span-1 flex items-center gap-1">
          <GripVertical className="h-4 w-4 cursor-move text-slate-300" />
          {mapping.is_key && (
            <span title="Key column">
              <Key className="h-4 w-4 text-amber-500" />
            </span>
          )}
        </div>

        {/* Source */}
        <div className="col-span-3">
          <div className="text-sm font-medium text-slate-900">
            {mapping.source_table}.{mapping.source_column}
          </div>
          <div className="text-xs text-slate-500">
            {mapping.source_system} • {mapping.source_datatype}
          </div>
        </div>

        {/* Arrow */}
        <div className="col-span-1 text-center">
          <ArrowRight className="inline h-4 w-4 text-slate-400" />
        </div>

        {/* Target */}
        <div className="col-span-3">
          <div className="text-sm font-medium text-slate-900">
            {mapping.target_table}.{mapping.target_column}
          </div>
          <div className="text-xs text-slate-500">
            {mapping.target_system} • {mapping.target_datatype}
          </div>
        </div>

        {/* Transform Type */}
        <div className="col-span-2">
          <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${transformType?.color || 'bg-slate-500'} text-white`}>
            {transformType?.label || mapping.transformation_type || 'Direct'}
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-2 flex items-center justify-end gap-2">
          <button
            onClick={onToggleExpand}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {!readOnly && (
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              {mapping.transformation_logic && (
                <div>
                  <span className="text-slate-500 font-medium">Transformation Logic:</span>
                  <pre className="mt-1 rounded bg-white p-2 text-xs text-slate-700 border border-slate-200">
                    {mapping.transformation_logic}
                  </pre>
                </div>
              )}
              {mapping.business_rule && (
                <div>
                  <span className="text-slate-500 font-medium">Business Rule:</span>
                  <p className="mt-1 text-slate-700">{mapping.business_rule}</p>
                </div>
              )}
              {mapping.notes && (
                <div className="col-span-2">
                  <span className="text-slate-500 font-medium">Notes:</span>
                  <p className="mt-1 text-slate-700">{mapping.notes}</p>
                </div>
              )}
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Nullable: {mapping.is_nullable ? 'Yes' : 'No'}</span>
                {mapping.default_value && <span>Default: {mapping.default_value}</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============ Mapping Form ============

interface MappingFormProps {
  onSubmit: (data: CreateSTTMMappingRequest) => void
  onCancel: () => void
  isSubmitting: boolean
  initialData?: Partial<STTMMapping>
}

function MappingForm({ onSubmit, onCancel, isSubmitting, initialData }: MappingFormProps) {
  const [formData, setFormData] = useState<CreateSTTMMappingRequest>({
    source_system: initialData?.source_system || '',
    source_table: initialData?.source_table || '',
    source_column: initialData?.source_column || '',
    source_datatype: initialData?.source_datatype || '',
    target_system: initialData?.target_system || '',
    target_table: initialData?.target_table || '',
    target_column: initialData?.target_column || '',
    target_datatype: initialData?.target_datatype || '',
    transformation_type: initialData?.transformation_type || 'direct',
    transformation_logic: initialData?.transformation_logic || '',
    business_rule: initialData?.business_rule || '',
    is_key: initialData?.is_key || false,
    is_nullable: initialData?.is_nullable ?? true,
    default_value: initialData?.default_value || '',
    notes: initialData?.notes || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h3 className="mb-4 font-semibold text-slate-900">New Mapping</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Source Fields */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-green-600">Source</h4>
          <input
            type="text"
            placeholder="System"
            value={formData.source_system}
            onChange={(e) => setFormData({ ...formData, source_system: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="text"
            placeholder="Table"
            value={formData.source_table}
            onChange={(e) => setFormData({ ...formData, source_table: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="text"
            placeholder="Column"
            value={formData.source_column}
            onChange={(e) => setFormData({ ...formData, source_column: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="text"
            placeholder="Datatype"
            value={formData.source_datatype}
            onChange={(e) => setFormData({ ...formData, source_datatype: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {/* Target Fields */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-blue-600">Target</h4>
          <input
            type="text"
            placeholder="System"
            value={formData.target_system}
            onChange={(e) => setFormData({ ...formData, target_system: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="text"
            placeholder="Table"
            value={formData.target_table}
            onChange={(e) => setFormData({ ...formData, target_table: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="text"
            placeholder="Column"
            value={formData.target_column}
            onChange={(e) => setFormData({ ...formData, target_column: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="text"
            placeholder="Datatype"
            value={formData.target_datatype}
            onChange={(e) => setFormData({ ...formData, target_datatype: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Transformation */}
      <div className="mt-4 space-y-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Transformation Type</label>
            <select
              value={formData.transformation_type}
              onChange={(e) => setFormData({ ...formData, transformation_type: e.target.value as TransformationType })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {TRANSFORMATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.is_key}
                onChange={(e) => setFormData({ ...formData, is_key: e.target.checked })}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Key Column
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.is_nullable}
                onChange={(e) => setFormData({ ...formData, is_nullable: e.target.checked })}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Nullable
            </label>
          </div>
        </div>

        <textarea
          placeholder="Transformation Logic (SQL, expression, etc.)"
          value={formData.transformation_logic}
          onChange={(e) => setFormData({ ...formData, transformation_logic: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />

        <input
          type="text"
          placeholder="Business Rule"
          value={formData.business_rule}
          onChange={(e) => setFormData({ ...formData, business_rule: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />

        <input
          type="text"
          placeholder="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Add Mapping
        </Button>
      </div>
    </motion.form>
  )
}
