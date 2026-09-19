import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { loginRequest, logoutRequest, refreshSession, subscribeSession } from './api'
import { AuthContext, type AuthContextValue } from './AuthContext'
import type { AuthStatus, AuthUser } from './types'

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Authentication could not be completed.'
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeSession((session) => {
    setUser(session?.user ?? null)
    setStatus(session ? 'authenticated' : 'anonymous')
  }), [])

  useEffect(() => {
    let cancelled = false

    void refreshSession()
      .then((session) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        setStatus(session ? 'authenticated' : 'anonymous')
        setError(null)
      })
      .catch((sessionError: unknown) => {
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
        setError(messageFrom(sessionError))
      })

    return () => {
      cancelled = true
    }
  }, [])

  const retrySession = useCallback(async () => {
    setStatus('checking')
    setError(null)

    try {
      const session = await refreshSession()
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'anonymous')
    } catch (sessionError: unknown) {
      setUser(null)
      setStatus('anonymous')
      setError(messageFrom(sessionError))
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)

    try {
      const session = await loginRequest(email, password)
      setUser(session.user)
      setStatus('authenticated')
      return session.user
    } catch (loginError: unknown) {
      const message = messageFrom(loginError)
      setError(message)
      throw new Error(message)
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)

    try {
      await logoutRequest()
      setUser(null)
      setStatus('anonymous')
    } catch (logoutError: unknown) {
      const message = messageFrom(logoutError)
      setError(message)
      throw new Error(message)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, login, logout, retrySession }),
    [error, login, logout, retrySession, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
