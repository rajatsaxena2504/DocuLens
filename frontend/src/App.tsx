import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { SessionProvider } from '@/context/SessionContext'
import { ProjectProvider } from '@/context/ProjectContext'
import { OrganizationProvider } from '@/context/OrganizationContext'
import { PageLoading } from '@/components/common/Loading'

// Pages - DocuLens SDLC Documentation
import WelcomePage from '@/pages/WelcomePage'
import ProjectsPage from '@/pages/ProjectsPage'
import NewProjectPage from '@/pages/NewProjectPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import AddRepositoryPage from '@/pages/AddRepositoryPage'
import StageDetailPage from '@/pages/StageDetailPage'
import DocumentsPage from '@/pages/DocumentsPage'
import NewDocumentPage from '@/pages/NewDocumentPage'
import SectionReviewPage from '@/pages/SectionReviewPage'
import DocumentEditorPage from '@/pages/DocumentEditorPage'
import GenerationProgressPage from '@/pages/GenerationProgressPage'
import TemplateLibraryPage from '@/pages/TemplateLibraryPage'
import SectionLibraryPage from '@/pages/SectionLibraryPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import OrganizationsPage from '@/pages/OrganizationsPage'
import CreateOrganizationPage from '@/pages/CreateOrganizationPage'
import OrganizationSettingsPage from '@/pages/OrganizationSettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoading />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes - Public only */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Main entry point - Welcome page (protected) */}
      <Route path="/" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />

      {/* Organizations */}
      <Route path="/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />
      <Route path="/organizations/new" element={<ProtectedRoute><CreateOrganizationPage /></ProtectedRoute>} />
      <Route path="/organizations/:orgId/settings" element={<ProtectedRoute><OrganizationSettingsPage /></ProtectedRoute>} />

      {/* SDLC Projects */}
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><NewProjectPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/repositories/add" element={<ProtectedRoute><AddRepositoryPage /></ProtectedRoute>} />

      {/* SDLC Stages */}
      <Route path="/projects/:projectId/stages/:stageId" element={<ProtectedRoute><StageDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stages/:stageId/documents/new" element={<ProtectedRoute><NewDocumentPage /></ProtectedRoute>} />

      {/* Documents */}
      <Route path="/projects/:projectId/documents/new" element={<ProtectedRoute><NewDocumentPage /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
      <Route path="/documents/new" element={<ProtectedRoute><NewDocumentPage /></ProtectedRoute>} />
      <Route path="/documents/:documentId/review" element={<ProtectedRoute><SectionReviewPage /></ProtectedRoute>} />
      <Route path="/documents/:documentId/edit" element={<ProtectedRoute><DocumentEditorPage /></ProtectedRoute>} />
      <Route path="/documents/:documentId/generating" element={<ProtectedRoute><GenerationProgressPage /></ProtectedRoute>} />

      {/* Library */}
      <Route path="/library/templates" element={<ProtectedRoute><TemplateLibraryPage /></ProtectedRoute>} />
      <Route path="/library/sections" element={<ProtectedRoute><SectionLibraryPage /></ProtectedRoute>} />

      {/* User */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Redirects for old routes */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <ProjectProvider>
          <SessionProvider>
            <AppRoutes />
          </SessionProvider>
        </ProjectProvider>
      </OrganizationProvider>
    </AuthProvider>
  )
}
