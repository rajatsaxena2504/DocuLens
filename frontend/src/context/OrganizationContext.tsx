import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { organizationsApi } from '@/api/organizations'
import { useAuth } from './AuthContext'
import type { OrganizationWithRole, OrganizationRole } from '@/types'

const ORG_STORAGE_KEY = 'doculens_current_org'

interface OrganizationContextType {
  organizations: OrganizationWithRole[]
  currentOrg: OrganizationWithRole | null
  // Multi-role support
  currentRoles: OrganizationRole[]  // Array of all user's roles in current org
  currentRole: OrganizationRole | null  // Primary role (highest privilege) - legacy compat
  isLoading: boolean
  switchOrg: (orgId: string | null) => void
  refreshOrganizations: () => Promise<void>
  // Role checks
  isOwner: boolean
  isEditor: boolean
  isReviewer: boolean
  isViewer: boolean
  // Permission checks (using additive logic)
  canEdit: boolean  // Owner OR Editor
  canReview: boolean  // Owner OR Reviewer
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [currentOrg, setCurrentOrg] = useState<OrganizationWithRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([])
      setCurrentOrg(null)
      setIsLoading(false)
      return
    }

    try {
      const orgs = await organizationsApi.list()
      setOrganizations(orgs)

      // Try to restore previously selected org
      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY)
      if (savedOrgId) {
        const savedOrg = orgs.find((o) => o.id === savedOrgId)
        if (savedOrg) {
          setCurrentOrg(savedOrg)
        } else if (orgs.length > 0) {
          setCurrentOrg(orgs[0])
          localStorage.setItem(ORG_STORAGE_KEY, orgs[0].id)
        }
      } else if (orgs.length > 0) {
        setCurrentOrg(orgs[0])
        localStorage.setItem(ORG_STORAGE_KEY, orgs[0].id)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations, user?.id])

  const switchOrg = (orgId: string | null) => {
    if (orgId === null) {
      setCurrentOrg(null)
      localStorage.removeItem(ORG_STORAGE_KEY)
      return
    }

    const org = organizations.find((o) => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem(ORG_STORAGE_KEY, org.id)
    }
  }

  const refreshOrganizations = async () => {
    await loadOrganizations()
  }

  // Multi-role: use roles array, fallback to single role for backwards compat
  const currentRoles: OrganizationRole[] = currentOrg?.roles ?? (currentOrg?.role ? [currentOrg.role] : [])
  const currentRole = currentOrg?.primary_role ?? currentOrg?.role ?? null

  // Role checks using multi-role array
  const isOwner = currentRoles.includes('owner')
  const isEditor = currentRoles.includes('editor')
  const isReviewer = currentRoles.includes('reviewer')
  const isViewer = currentRoles.includes('viewer')

  // Permission checks (additive)
  const canEdit = isOwner || isEditor
  const canReview = isOwner || isReviewer

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        currentRoles,
        currentRole,
        isLoading,
        switchOrg,
        refreshOrganizations,
        isOwner,
        isEditor,
        isReviewer,
        isViewer,
        canEdit,
        canReview,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
