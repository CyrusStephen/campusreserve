import { useState } from 'react'

type BrandWordmarkProps = {
  className?: string
  decorative?: boolean
  tone?: 'auto' | 'light' | 'dark'
}

import { productBrand } from '../branding/tenant'

export default function BrandWordmark({ className = '', decorative = false, tone = 'auto' }: BrandWordmarkProps) {
  const [darkInkReady, setDarkInkReady] = useState(false)
  const [lightInkReady, setLightInkReady] = useState(false)

  return (
    <span
      className={`cr-brand-wordmark cr-brand-wordmark-${tone}${darkInkReady ? ' cr-brand-wordmark-dark-ready' : ''}${lightInkReady ? ' cr-brand-wordmark-light-ready' : ''} ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'CampusReserve'}
      aria-hidden={decorative || undefined}
    >
      <span className="cr-brand-wordmark-fallback" aria-hidden="true"><span>Campus</span><em>Reserve</em></span>
      <img className="cr-brand-wordmark-dark-ink" src={productBrand.wordmarkDarkUrl} alt="" draggable="false" onLoad={() => setDarkInkReady(true)} />
      <img className="cr-brand-wordmark-light-ink" src={productBrand.wordmarkUrl} alt="" draggable="false" onLoad={() => setLightInkReady(true)} />
    </span>
  )
}
