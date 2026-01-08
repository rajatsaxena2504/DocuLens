import type { OrganizationRole } from '@/types'

interface RoleBadgeProps {
  role: OrganizationRole
  size?: 'sm' | 'default'
  showDot?: boolean
}

const roleConfig: Record<OrganizationRole, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
  owner: {
    label: 'Owner',
    bgClass: 'bg-primary-50',
    textClass: 'text-primary-700',
    dotClass: 'bg-primary-500',
  },
  editor: {
    label: 'Editor',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  reviewer: {
    label: 'Reviewer',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    dotClass: 'bg-purple-500',
  },
  viewer: {
    label: 'Viewer',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
  },
}

export function RoleBadge({ role, size = 'default', showDot = true }: RoleBadgeProps) {
  const config = roleConfig[role]
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    default: 'text-xs px-2.5 py-1 gap-1.5',
  }
  const dotSizeClasses = {
    sm: 'w-1 h-1',
    default: 'w-1.5 h-1.5',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bgClass} ${config.textClass} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`rounded-full flex-shrink-0 ${config.dotClass} ${dotSizeClasses[size]}`} />
      )}
      {config.label}
    </span>
  )
}

interface RoleBadgesProps {
  roles: OrganizationRole[]
  maxDisplay?: number
  size?: 'sm' | 'default'
  showDots?: boolean
}

export function RoleBadges({ roles, maxDisplay = 2, size = 'default', showDots = true }: RoleBadgesProps) {
  // Sort roles by hierarchy: owner > editor > reviewer > viewer
  const sortedRoles = [...roles].sort((a, b) => {
    const order: Record<OrganizationRole, number> = { owner: 0, editor: 1, reviewer: 2, viewer: 3 }
    return order[a] - order[b]
  })

  const displayRoles = sortedRoles.slice(0, maxDisplay)
  const remainingRoles = sortedRoles.slice(maxDisplay)
  const overflowSizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-xs px-2.5 py-1',
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayRoles.map((role) => (
        <RoleBadge key={role} role={role} size={size} showDot={showDots} />
      ))}
      {remainingRoles.length > 0 && (
        <span
          className={`inline-flex items-center rounded-full font-medium bg-slate-200 text-slate-600 ${overflowSizeClasses[size]}`}
          title={remainingRoles.map(r => roleConfig[r].label).join(', ')}
        >
          +{remainingRoles.length}
        </span>
      )}
    </div>
  )
}

// Superadmin badge (separate since it's system-wide, not per-org)
export function SuperadminBadge({ size = 'default', showDot = true }: { size?: 'sm' | 'default'; showDot?: boolean }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    default: 'text-xs px-2.5 py-1 gap-1.5',
  }
  const dotSizeClasses = {
    sm: 'w-1 h-1',
    default: 'w-1.5 h-1.5',
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium bg-amber-50 text-amber-700 ${sizeClasses[size]}`}>
      {showDot && (
        <span className={`rounded-full flex-shrink-0 bg-amber-500 ${dotSizeClasses[size]}`} />
      )}
      Superadmin
    </span>
  )
}
