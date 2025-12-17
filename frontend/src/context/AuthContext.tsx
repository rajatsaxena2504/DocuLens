import { createContext, useContext, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
// AUTH DISABLED TEMPORARILY - Uncomment to re-enable authentication
// import { storage } from '@/utils/storage'
// import { authApi } from '@/api/auth'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for development - remove when re-enabling auth
const MOCK_USER: User = {
  id: 'mock-user-id-12345',
  email: 'dev@docugen.local',
  name: 'Developer',
  created_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // AUTH DISABLED: Using mock user instead of real authentication
  const [user] = useState<User | null>(MOCK_USER)
  const [isLoading] = useState(false) // Set to false since no auth check needed
  const navigate = useNavigate()

  // AUTH DISABLED: Original auth initialization commented out
  /*
  useEffect(() => {
    const initAuth = async () => {
      if (storage.isAuthenticated()) {
        try {
          const userData = await authApi.getMe()
          setUser(userData)
        } catch {
          storage.removeToken()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])
  */

  // AUTH DISABLED: Stub functions that do nothing
  const login = async (_email: string, _password: string) => {
    // Original login logic commented out
    /*
    const response = await authApi.login({ username: email, password })
    storage.setToken(response.access_token)
    const userData = await authApi.getMe()
    setUser(userData)
    */
    navigate('/')
  }

  const register = async (_email: string, _password: string, _name?: string) => {
    // Original register logic commented out
    /*
    await authApi.register({ email, password, name })
    await login(email, password)
    */
    navigate('/')
  }

  const logout = () => {
    // Original logout logic commented out
    /*
    storage.removeToken()
    setUser(null)
    navigate('/login')
    */
    navigate('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: true, // AUTH DISABLED: Always authenticated
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
