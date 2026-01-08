import { useState } from 'react'
import { Settings, Moon, Sun, Bell, Globe, Palette, Monitor, Save } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '@/components/common/Layout'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  notifications: {
    email: boolean
    browser: boolean
    documentUpdates: boolean
    reviewRequests: boolean
  }
  editor: {
    autoSave: boolean
    spellCheck: boolean
    lineNumbers: boolean
  }
  language: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    theme: 'system',
    notifications: {
      email: true,
      browser: true,
      documentUpdates: true,
      reviewRequests: true,
    },
    editor: {
      autoSave: true,
      spellCheck: true,
      lineNumbers: false,
    },
    language: 'en',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement settings save API
      await new Promise(resolve => setTimeout(resolve, 500))
      localStorage.setItem('doculens_settings', JSON.stringify(settings))
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateNotification = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const updateEditor = (key: keyof SettingsState['editor'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      editor: { ...prev.editor, [key]: value }
    }))
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-600 mt-1">Customize your DocuLens experience</p>
            </div>
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Palette className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
                <p className="text-sm text-slate-500">Customize how DocuLens looks</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                <div className="flex gap-3">
                  {[
                    { value: 'light', icon: Sun, label: 'Light' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                    { value: 'system', icon: Monitor, label: 'System' },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setSettings(prev => ({ ...prev, theme: value as Theme }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        settings.theme === value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                <p className="text-sm text-slate-500">Manage your notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                { key: 'browser', label: 'Browser Notifications', desc: 'Show desktop notifications' },
                { key: 'documentUpdates', label: 'Document Updates', desc: 'When documents are modified' },
                { key: 'reviewRequests', label: 'Review Requests', desc: 'When you are assigned as reviewer' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">{label}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications[key as keyof SettingsState['notifications']]}
                    onChange={(e) => updateNotification(key as keyof SettingsState['notifications'], e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Settings className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Editor</h2>
                <p className="text-sm text-slate-500">Configure the document editor</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: 'autoSave', label: 'Auto-save', desc: 'Automatically save changes' },
                { key: 'spellCheck', label: 'Spell Check', desc: 'Highlight spelling errors' },
                { key: 'lineNumbers', label: 'Line Numbers', desc: 'Show line numbers in code blocks' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900">{label}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.editor[key as keyof SettingsState['editor']]}
                    onChange={(e) => updateEditor(key as keyof SettingsState['editor'], e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Data & Privacy</h2>
                <p className="text-sm text-slate-500">Manage your data</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button variant="outline" size="sm">
                Export My Data
              </Button>
              <p className="text-sm text-slate-500">
                Download a copy of all your data including documents, projects, and settings.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
