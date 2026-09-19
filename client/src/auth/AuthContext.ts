import { createContext } from 'react'
import type { AuthStatus, AuthUser } from './types'

export type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  retrySession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
