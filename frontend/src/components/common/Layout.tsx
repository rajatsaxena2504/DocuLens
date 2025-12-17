import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  User,
  Settings,
} from 'lucide-react'
import { cn } from '@/utils/helpers'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Documents', href: '/documents', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:translate-x-0',
          'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 pointer-events-none" />

        <div className="relative flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-slate-700/50">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-white">DocuGen</span>
            </Link>
            <button
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/10 text-white'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-slate-800/50 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="h-2 w-2 rounded-full bg-primary-400"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Pro Badge / Feature highlight */}
          <div className="px-4 py-3">
            <div className="rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary-500 to-accent-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">AI Powered</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate professional docs with Gemini AI
              </p>
            </div>
          </div>

          {/* User section */}
          <div className="border-t border-slate-700/50 p-4">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex w-full items-center gap-3 rounded-xl p-3 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <ChevronRight className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  isUserMenuOpen && 'rotate-90'
                )} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden"
                  >
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <div className="border-t border-slate-700" />
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-6">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb or page title can go here */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Add global actions here if needed */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
