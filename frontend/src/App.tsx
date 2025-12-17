import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { SessionProvider } from '@/context/SessionContext'
import { ProjectProvider } from '@/context/ProjectContext'

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

// AUTH DISABLED: ProtectedRoute wrapper commented out
/*
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
*/

function AppRoutes() {
  return (
    <Routes>
      {/* Main entry point - Welcome page */}
      <Route path="/" element={<WelcomePage />} />

      {/* SDLC Projects */}
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/new" element={<NewProjectPage />} />
      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      <Route path="/projects/:projectId/repositories/add" element={<AddRepositoryPage />} />

      {/* SDLC Stages */}
      <Route path="/projects/:projectId/stages/:stageId" element={<StageDetailPage />} />
      <Route path="/projects/:projectId/stages/:stageId/documents/new" element={<NewDocumentPage />} />

      {/* Documents */}
      <Route path="/projects/:projectId/documents/new" element={<NewDocumentPage />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/documents/new" element={<NewDocumentPage />} />
      <Route path="/documents/:documentId/review" element={<SectionReviewPage />} />
      <Route path="/documents/:documentId/edit" element={<DocumentEditorPage />} />
      <Route path="/documents/:documentId/generating" element={<GenerationProgressPage />} />

      {/* Redirects for old routes */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </ProjectProvider>
    </AuthProvider>
  )
}
