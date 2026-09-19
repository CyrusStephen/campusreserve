import { ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiBlobRequest } from '../auth/api'
import type { ResourceImage } from './types'

export default function ResourcePhoto({ photo, className = '' }: { photo?: ResourceImage; className?: string }) {
  const [source, setSource] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    setSource(null)
    setFailed(false)
    if (photo?.url.startsWith('/api/resource-images/')) {
      void apiBlobRequest(photo.url.slice(4), { signal: controller.signal }).then((blob) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setSource(objectUrl)
      }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    } else if (photo?.url.startsWith('https://')) {
      setSource(photo.url)
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [photo?.url])

  return (
    <div className={`cr-photo ${className}`}>
      {source && !failed ? <img src={source} alt={photo?.altText ?? ''} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : (
        <div className="cr-photo-empty"><ImageIcon size={28} aria-hidden="true" /><span>{failed ? 'Photo unavailable' : photo ? 'Loading photo…' : 'Photo coming soon'}</span></div>
      )}
    </div>
  )
}
