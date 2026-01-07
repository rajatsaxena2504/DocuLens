import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { organizationsApi } from '@/api/organizations'
import { useAuth } from './AuthContext'
import type { OrganizationWithRole, OrganizationRole } from '@/types'

const ORG_STORAGE_KEY = 'doculens_current_org'

interface OrganizationContextType {
  organizations: OrganizationWithRole[]
  currentOrg: OrganizationWithRole | null
  currentRole: OrganizationRole | null
  isLoading: boolean
  switchOrg: (orgId: string | null) => void
  refreshOrganizations: () => Promise<void>
  isAdmin: boolean
  isEditor: boolean
  canEdit: boolean
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

  const currentRole = currentOrg?.role ?? null
  const isAdmin = currentRole === 'admin'
  const isEditor = currentRole === 'editor'
  const canEdit = isAdmin || isEditor

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        currentRole,
        isLoading,
        switchOrg,
        refreshOrganizations,
        isAdmin,
        isEditor,
        canEdit,
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
