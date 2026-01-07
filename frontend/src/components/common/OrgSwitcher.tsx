import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown, Plus, Settings, Check } from 'lucide-react'
import { useOrganization } from '@/context/OrganizationContext'
import { cn } from '@/utils/helpers'

export default function OrgSwitcher() {
  const { organizations, currentOrg, switchOrg, isAdmin } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-600',
      editor: 'bg-blue-100 text-blue-600',
      viewer: 'bg-slate-100 text-slate-600',
    }
    return colors[role as keyof typeof colors] || colors.viewer
  }

  if (organizations.length === 0) {
    return (
      <Link
        to="/organizations/new"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-200">
          <Plus className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <span className="text-sm font-medium text-slate-600">Create Organization</span>
      </Link>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          isOpen ? 'bg-slate-100' : 'hover:bg-slate-50'
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100">
          <Building2 className="h-4 w-4 text-primary-600" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {currentOrg?.name || 'Select Organization'}
          </p>
          {currentOrg && (
            <p className="text-xs text-slate-500 truncate">/{currentOrg.slug}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden z-50">
          <div className="max-h-64 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrg(org.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 transition-colors',
                  currentOrg?.id === org.id
                    ? 'bg-primary-50'
                    : 'hover:bg-slate-50'
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                  <Building2 className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">/{org.slug}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded capitalize', getRoleBadge(org.role))}>
                      {org.role}
                    </span>
                  </div>
                </div>
                {currentOrg?.id === org.id && (
                  <Check className="h-4 w-4 text-primary-600" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100">
            {currentOrg && isAdmin && (
              <Link
                to={`/organizations/${currentOrg.id}/settings`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Organization Settings
              </Link>
            )}
            <Link
              to="/organizations"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Manage Organizations
            </Link>
            <Link
              to="/organizations/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create New Organization
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
