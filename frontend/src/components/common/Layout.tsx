import { ReactNode, useState, useMemo } from 'react'
import { Link, useLocation, matchPath } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProjectContext } from '@/context/ProjectContext'
import { useOrganization } from '@/context/OrganizationContext'
import {
  FileText,
  FolderKanban,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Settings,
  BookOpen,
  Library,
  Layers,
  Shield,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/utils/helpers'
import ProjectSidebar from '@/components/project/ProjectSidebar'
import Breadcrumb from '@/components/common/Breadcrumb'
import OrgSwitcher from '@/components/common/OrgSwitcher'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isSuperadmin } = useAuth()
  const location = useLocation()
  const { breadcrumbItems } = useProjectContext()
  const { canReview, isOwner } = useOrganization()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Detect if we're in a project context
  const isInProjectContext = useMemo(() => {
    // Check for project detail pages
    const projectDetailMatch = matchPath('/projects/:projectId/*', location.pathname)
    if (
      location.pathname === '/projects' ||
      location.pathname === '/projects/new'
    ) {
      return false
    }
    if (projectDetailMatch) return true

    // Also check for document pages (they belong to a project context)
    const documentMatch = matchPath('/documents/:documentId/*', location.pathname)
    return !!documentMatch
  }, [location.pathname])

  const navigation = [
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Documents', href: '/documents', icon: FileText },
    ...(canReview ? [{ name: 'Reviews', href: '/reviews', icon: ClipboardCheck }] : []),
  ]

  // Library navigation - only visible to owners (for managing templates/sections)
  const libraryNavigation = isOwner ? [
    { name: 'Template Library', href: '/library/templates', icon: Library },
    { name: 'Section Library', href: '/library/sections', icon: Layers },
  ] : []

  return (
    <div className="min-h-screen bg-page">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-slate-200 transition-transform duration-200 lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-base font-semibold text-slate-900">DocuLens</span>
            </Link>
            <button
              className="p-1.5 text-slate-400 hover:text-slate-600 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Organization Switcher */}
          <div className="px-2 py-2 border-b border-slate-100">
            <OrgSwitcher />
          </div>

          {/* Conditional sidebar content */}
          {isInProjectContext ? (
            <ProjectSidebar className="flex-1" />
          ) : (
            <>
              {/* Navigation */}
              <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
                {/* Main navigation */}
                <div className="space-y-0.5">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>

                {/* Library section - only for owners */}
                {libraryNavigation.length > 0 && (
                  <div>
                    <p className="px-3 mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Library
                    </p>
                    <div className="space-y-0.5">
                      {libraryNavigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </nav>

              {/* Help section */}
              <div className="px-2 py-2 border-t border-slate-100">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs font-medium text-slate-700 mb-0.5">SDLC Documentation</p>
                  <p className="text-xs text-slate-500">
                    Generate docs for every phase.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* User section */}
          <div className="border-t border-slate-100 p-2">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-medium">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
                <ChevronRight className={cn(
                  'h-3.5 w-3.5 text-slate-400 transition-transform',
                  isUserMenuOpen && 'rotate-90'
                )} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  {isSuperadmin && (
                    <>
                      <div className="border-t border-slate-100" />
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </>
                  )}
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-56">
        {/* Top bar - only show if breadcrumbs exist */}
        {breadcrumbItems.length > 0 && (
          <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <Breadcrumb items={breadcrumbItems} />
          </header>
        )}

        {/* Mobile menu button when no breadcrumbs */}
        {breadcrumbItems.length === 0 && (
          <div className="sticky top-0 z-30 flex h-12 items-center px-4 lg:hidden border-b border-slate-200 bg-white">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 lg:p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
