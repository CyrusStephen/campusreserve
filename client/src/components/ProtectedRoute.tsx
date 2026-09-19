import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'checking') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f6f3] text-[#191919] dark:bg-[#191919] dark:text-[#f7f6f3]">
        <p role="status" className="font-semibold">Checking your session…</p>
      </main>
    )
  }

  if (auth.status !== 'authenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return children
}

export default ProtectedRoute
