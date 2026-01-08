import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'
import { organizationsApi } from '@/api/organizations'
import { useOrganization } from '@/context/OrganizationContext'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import toast from 'react-hot-toast'

export default function CreateOrganizationPage() {
  const navigate = useNavigate()
  const { isSuperadmin } = useAuth()
  const { refreshOrganizations, switchOrg } = useOrganization()
  const [name, setName] = useState('')

  // Redirect non-superadmins
  useEffect(() => {
    if (!isSuperadmin) {
      toast.error('Only superadmins can create organizations')
      navigate('/organizations')
    }
  }, [isSuperadmin, navigate])
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    // Auto-generate slug from name if slug hasn't been manually edited
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(generateSlug(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Organization name is required')
      return
    }

    setIsLoading(true)

    try {
      const org = await organizationsApi.create({
        name: name.trim(),
        slug: slug || undefined,
      })

      await refreshOrganizations()
      switchOrg(org.id)
      toast.success('Organization created successfully!')
      // Navigate to org settings so superadmin can add members
      navigate(`/organizations/${org.id}/settings`)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            'Failed to create organization'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/organizations')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to organizations
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-xl bg-primary-100 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Organization</h1>
            <p className="text-sm text-slate-500">
              Set up a new workspace for your team
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="space-y-5">
            <Input
              id="name"
              label="Organization name"
              value={name}
              onChange={handleNameChange}
              placeholder="Acme Corp"
              required
            />

            <div>
              <Input
                id="slug"
                label="URL slug"
                value={slug}
                onChange={handleSlugChange}
                placeholder="acme-corp"
                hint="This will be used in URLs and must be unique"
              />
              {slug && (
                <p className="mt-1 text-xs text-slate-500">
                  Your organization URL: <span className="font-mono">doculens.app/{slug}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/organizations')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create Organization
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 mb-2">What happens next?</h4>
          <ul className="text-sm text-slate-500 space-y-1">
            <li>You'll be the owner of this organization</li>
            <li>You can invite team members and assign roles</li>
            <li>Create projects and start documenting together</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
