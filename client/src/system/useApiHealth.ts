import { useEffect, useState } from 'react'

export type HealthState = 'checking' | 'online' | 'offline'

export function useApiHealth(enabled = true) {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    if (!enabled) return

    let active = true
    let controller: AbortController | null = null
    const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
    const apiBaseUrl = configuredApiUrl ?? (import.meta.env.DEV ? 'http://localhost:5000' : '')

    const check = () => {
      controller?.abort()
      controller = new AbortController()
      setHealth('checking')
      fetch(`${apiBaseUrl}/api/health`, { cache: 'no-store', signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('Health check failed')
          if (active) setHealth('online')
        })
        .catch((error: unknown) => {
          if (active && !(error instanceof DOMException && error.name === 'AbortError')) setHealth('offline')
        })
    }

    check()
    const interval = window.setInterval(check, 30_000)
    return () => {
      active = false
      controller?.abort()
      window.clearInterval(interval)
    }
  }, [enabled])

  return health
}
