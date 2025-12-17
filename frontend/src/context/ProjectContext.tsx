import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import type { SDLCProjectDetail, SDLCStage, Repository } from '@/types'

interface ProjectContextType {
  // Current project context
  currentProject: SDLCProjectDetail | null
  setCurrentProject: (project: SDLCProjectDetail | null) => void

  // Current stage context
  currentStage: SDLCStage | null
  setCurrentStage: (stage: SDLCStage | null) => void

  // Selected repositories for document generation
  selectedRepos: Repository[]
  setSelectedRepos: (repos: Repository[]) => void
  toggleRepo: (repo: Repository) => void
  clearSelectedRepos: () => void

  // Breadcrumb helpers
  breadcrumbItems: BreadcrumbItem[]
  setBreadcrumbItems: (items: BreadcrumbItem[]) => void
}

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<SDLCProjectDetail | null>(null)
  const [currentStage, setCurrentStage] = useState<SDLCStage | null>(null)
  const [selectedRepos, setSelectedRepos] = useState<Repository[]>([])
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([])

  const toggleRepo = useCallback((repo: Repository) => {
    setSelectedRepos((prev) => {
      const exists = prev.find((r) => r.id === repo.id)
      if (exists) {
        return prev.filter((r) => r.id !== repo.id)
      }
      return [...prev, repo]
    })
  }, [])

  const clearSelectedRepos = useCallback(() => {
    setSelectedRepos([])
  }, [])

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        currentStage,
        setCurrentStage,
        selectedRepos,
        setSelectedRepos,
        toggleRepo,
        clearSelectedRepos,
        breadcrumbItems,
        setBreadcrumbItems,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectContext() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}
