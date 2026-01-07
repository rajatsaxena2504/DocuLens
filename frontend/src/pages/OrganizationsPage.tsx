import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Plus, FolderOpen, Settings, ChevronRight } from 'lucide-react'
import { organizationsApi } from '@/api/organizations'
import { useOrganization } from '@/context/OrganizationContext'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import { PageLoading } from '@/components/common/Loading'
import type { OrganizationWithRole } from '@/types'

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const { switchOrg } = useOrganization()
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      const orgs = await organizationsApi.list()
      setOrganizations(orgs)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectOrg = (org: OrganizationWithRole) => {
    switchOrg(org.id)
    navigate('/projects')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700'
      case 'editor':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <PageLoading />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your teams and collaborate on documentation projects
            </p>
          </div>
          <Link to="/organizations/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </Button>
          </Link>
        </div>

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No organizations yet</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Create an organization to collaborate with your team on documentation projects.
            </p>
            <Link to="/organizations/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create your first organization
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{org.name}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getRoleBadgeColor(org.role)}`}
                        >
                          {org.role}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">/{org.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {org.role === 'admin' && (
                      <Link
                        to={`/organizations/${org.id}/settings`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleSelectOrg(org)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-sm font-medium">View Projects</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
