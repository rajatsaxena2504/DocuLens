import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown, Plus, Settings, Check, UserPlus } from 'lucide-react'
import { useOrganization } from '@/context/OrganizationContext'
import { useAuth } from '@/context/AuthContext'
import { RoleBadges } from '@/components/common/RoleBadges'
import { cn } from '@/utils/helpers'

export default function OrgSwitcher() {
  const { organizations, currentOrg, switchOrg, isOwner } = useOrganization()
  const { isSuperadmin } = useAuth()
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

  if (organizations.length === 0) {
    return (
      <Link
        to="/organizations"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-200">
          <UserPlus className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <span className="text-sm font-medium text-slate-600">Join Organization</span>
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
        <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xl overflow-hidden z-50 animate-fade-in">
          <div className="max-h-64 overflow-y-auto py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrg(org.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 transition-all duration-200',
                  currentOrg?.id === org.id
                    ? 'bg-primary-50'
                    : 'hover:bg-slate-50'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  currentOrg?.id === org.id ? 'bg-primary-100' : 'bg-slate-100'
                )}>
                  <Building2 className={cn(
                    'h-4 w-4',
                    currentOrg?.id === org.id ? 'text-primary-600' : 'text-slate-600'
                  )} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-500">/{org.slug}</span>
                    <RoleBadges roles={org.roles || [org.role]} maxDisplay={2} size="sm" />
                  </div>
                </div>
                {currentOrg?.id === org.id && (
                  <Check className="h-4 w-4 text-primary-600" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 py-1">
            {currentOrg && (isSuperadmin || isOwner) && (
              <Link
                to={`/organizations/${currentOrg.id}/settings`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                Organization Settings
              </Link>
            )}
            <Link
              to="/organizations"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-all duration-200"
            >
              <Building2 className="h-4 w-4" />
              All Organizations
            </Link>
            {isSuperadmin && (
              <Link
                to="/organizations/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-primary-600 hover:bg-primary-50 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Create New Organization
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
