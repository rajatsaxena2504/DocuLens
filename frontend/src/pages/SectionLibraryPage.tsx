import { useState, useMemo } from 'react'
import {
  FileText,
  Layers,
  Search,
  ChevronRight,
} from 'lucide-react'
import Layout from '@/components/common/Layout'
import { Card } from '@/components/common/Card'
import { useSectionsLibrary } from '@/hooks/useSections'
import { cn } from '@/utils/helpers'

const stageColors: Record<string, string> = {
  Requirements: 'bg-blue-100 text-blue-700',
  Design: 'bg-purple-100 text-purple-700',
  Development: 'bg-green-100 text-green-700',
  Testing: 'bg-yellow-100 text-yellow-700',
  Deployment: 'bg-orange-100 text-orange-700',
  Maintenance: 'bg-slate-100 text-slate-700',
}

export default function SectionLibraryPage() {
  const { data: sections, isLoading } = useSectionsLibrary()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!sections) return []

    if (!searchQuery) return sections

    const query = searchQuery.toLowerCase()
    return sections.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.templates_using?.some(t => t.name.toLowerCase().includes(query))
    )
  }, [sections, searchQuery])

  // Group sections by template count for stats
  const stats = useMemo(() => {
    if (!sections) return { total: 0, used: 0, unused: 0 }

    const total = sections.length
    const used = sections.filter(s => s.template_count > 0).length
    const unused = total - used

    return { total, used, unused }
  }, [sections])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <Layers className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Section Library</h1>
              <p className="text-sm text-slate-500">
                Browse all available sections and see which templates use them
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-500">Total Sections</p>
          </Card>
          <Card className="p-4">
            <p className="text-3xl font-bold text-green-600">{stats.used}</p>
            <p className="text-sm text-slate-500">Used in Templates</p>
          </Card>
          <Card className="p-4">
            <p className="text-3xl font-bold text-slate-400">{stats.unused}</p>
            <p className="text-sm text-slate-500">Not Used</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sections or templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Sections List */}
        <div className="space-y-2">
          {filteredSections.length === 0 ? (
            <Card className="p-8 text-center">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No sections found</p>
            </Card>
          ) : (
            filteredSections.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedSection(
                    expandedSection === section.id ? null : section.id
                  )}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded transition-transform mt-0.5',
                      expandedSection === section.id && 'rotate-90'
                    )}
                  >
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{section.name}</h3>
                      {section.template_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {section.template_count} template{section.template_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Not used
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {section.description || 'No description'}
                    </p>
                  </div>
                </button>

                {/* Expanded section showing templates */}
                {expandedSection === section.id && section.templates_using.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                      Used in these templates
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {section.templates_using.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">{template.name}</span>
                          {template.stage && (
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-xs font-medium',
                              stageColors[template.stage] || 'bg-slate-100 text-slate-600'
                            )}>
                              {template.stage}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state for unused sections */}
                {expandedSection === section.id && section.templates_using.length === 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-center">
                    <p className="text-sm text-slate-500">
                      This section is not currently used in any template
                    </p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Info box */}
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is a read-only view of all available sections.
            To edit section descriptions, go to the Template Library where you can
            update descriptions that will apply to all documents using that section.
          </p>
        </Card>
      </div>
    </Layout>
  )
}
