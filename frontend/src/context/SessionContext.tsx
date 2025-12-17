import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

// Session document status
export type DocumentStatus = 'analyzing' | 'ready' | 'generating' | 'editing' | 'completed'

// Document in session (before backend persistence)
export interface SessionDocument {
  id: string
  projectId?: string
  githubUrl: string
  templateFile?: File
  templateId?: string
  templateName?: string
  title: string
  status: DocumentStatus
  sections: SessionSection[]
  createdAt: string
  updatedAt: string
}

// Section in session (before backend persistence)
export interface SessionSection {
  id: string
  name: string
  description: string
  isIncluded: boolean
  displayOrder: number
  content?: string
  isGenerating?: boolean
}

// Document creation input
export interface CreateDocumentInput {
  projectId?: string
  githubUrl: string
  templateFile?: File
  templateId?: string
  templateName?: string
  status?: DocumentStatus
}

interface SessionContextType {
  documents: SessionDocument[]
  activeDocumentId: string | null
  activeDocument: SessionDocument | null

  // Document management
  createDocument: (input: CreateDocumentInput) => SessionDocument
  updateDocument: (id: string, updates: Partial<SessionDocument>) => void
  deleteDocument: (id: string) => void
  setActiveDocument: (id: string | null) => void
  getDocument: (id: string) => SessionDocument | undefined

  // Section management
  updateSections: (documentId: string, sections: SessionSection[]) => void
  updateSection: (documentId: string, sectionId: string, updates: Partial<SessionSection>) => void
  addSection: (documentId: string, section: Omit<SessionSection, 'id'>) => SessionSection
  removeSection: (documentId: string, sectionId: string) => void
  reorderSections: (documentId: string, sectionIds: string[]) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

const STORAGE_KEY = 'doculens_session'

// Helper to serialize session (excluding File objects)
const serializeSession = (documents: SessionDocument[]): string => {
  return JSON.stringify(documents.map(doc => ({
    ...doc,
    templateFile: undefined, // Files can't be serialized
  })))
}

// Helper to deserialize session
const deserializeSession = (data: string): SessionDocument[] => {
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<SessionDocument[]>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return deserializeSession(saved)
      }
    }
    return []
  })

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(() => {
    // Try to restore active document from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${STORAGE_KEY}_active`) || null
    }
    return null
  })

  // Persist to localStorage whenever documents change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, serializeSession(documents))
  }, [documents])

  // Persist active document ID
  useEffect(() => {
    if (activeDocumentId) {
      localStorage.setItem(`${STORAGE_KEY}_active`, activeDocumentId)
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_active`)
    }
  }, [activeDocumentId])

  // Get active document
  const activeDocument = documents.find(d => d.id === activeDocumentId) || null

  // Create a new document
  const createDocument = useCallback((input: CreateDocumentInput): SessionDocument => {
    const now = new Date().toISOString()
    const newDoc: SessionDocument = {
      id: uuidv4(),
      projectId: input.projectId,
      githubUrl: input.githubUrl,
      templateFile: input.templateFile,
      templateId: input.templateId,
      templateName: input.templateName,
      title: input.templateName || extractRepoName(input.githubUrl),
      status: input.status || 'analyzing',
      sections: [],
      createdAt: now,
      updatedAt: now,
    }

    setDocuments(prev => [...prev, newDoc])
    return newDoc
  }, [])

  // Update a document
  const updateDocument = useCallback((id: string, updates: Partial<SessionDocument>) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id
          ? { ...doc, ...updates, updatedAt: new Date().toISOString() }
          : doc
      )
    )
  }, [])

  // Delete a document
  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
    if (activeDocumentId === id) {
      setActiveDocumentId(null)
    }
  }, [activeDocumentId])

  // Set active document
  const setActiveDocument = useCallback((id: string | null) => {
    setActiveDocumentId(id)
  }, [])

  // Get a document by ID
  const getDocument = useCallback((id: string) => {
    return documents.find(d => d.id === id)
  }, [documents])

  // Update all sections for a document
  const updateSections = useCallback((documentId: string, sections: SessionSection[]) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? { ...doc, sections, updatedAt: new Date().toISOString() }
          : doc
      )
    )
  }, [])

  // Update a single section
  const updateSection = useCallback((documentId: string, sectionId: string, updates: Partial<SessionSection>) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? {
              ...doc,
              sections: doc.sections.map(s =>
                s.id === sectionId ? { ...s, ...updates } : s
              ),
              updatedAt: new Date().toISOString(),
            }
          : doc
      )
    )
  }, [])

  // Add a new section
  const addSection = useCallback((documentId: string, section: Omit<SessionSection, 'id'>): SessionSection => {
    const newSection: SessionSection = {
      ...section,
      id: uuidv4(),
    }

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? {
              ...doc,
              sections: [...doc.sections, newSection],
              updatedAt: new Date().toISOString(),
            }
          : doc
      )
    )

    return newSection
  }, [])

  // Remove a section
  const removeSection = useCallback((documentId: string, sectionId: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? {
              ...doc,
              sections: doc.sections.filter(s => s.id !== sectionId),
              updatedAt: new Date().toISOString(),
            }
          : doc
      )
    )
  }, [])

  // Reorder sections
  const reorderSections = useCallback((documentId: string, sectionIds: string[]) => {
    setDocuments(prev =>
      prev.map(doc => {
        if (doc.id !== documentId) return doc

        const reorderedSections = sectionIds
          .map((id, index) => {
            const section = doc.sections.find(s => s.id === id)
            return section ? { ...section, displayOrder: index } : null
          })
          .filter(Boolean) as SessionSection[]

        return {
          ...doc,
          sections: reorderedSections,
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }, [])

  return (
    <SessionContext.Provider
      value={{
        documents,
        activeDocumentId,
        activeDocument,
        createDocument,
        updateDocument,
        deleteDocument,
        setActiveDocument,
        getDocument,
        updateSections,
        updateSection,
        addSection,
        removeSection,
        reorderSections,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// Helper function to extract repo name from GitHub URL
function extractRepoName(url: string): string {
  const match = url.match(/github\.com\/[\w-]+\/([\w.-]+)/)
  return match ? match[1].replace(/\.git$/, '') : 'Untitled Document'
}
