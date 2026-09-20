import { useEffect, useState, type ReactNode } from 'react'
import { productBrand, tenantBrand } from '../branding/tenant'
import BrandWordmark from './BrandWordmark'
import './launch-splash.css'

const SPLASH_SEEN_KEY = 'campusreserve:splash-seen'

export default function LaunchSplash({ children }: { children: ReactNode }) {
  const preview = new URLSearchParams(window.location.search).get('splash') === 'preview'
  const [visible, setVisible] = useState(() => preview || sessionStorage.getItem(SPLASH_SEEN_KEY) !== 'yes')
  const [holding, setHolding] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    const fallbackTimer = window.setTimeout(() => finishSplash(), 8_000)
    return () => window.clearTimeout(fallbackTimer)
  }, [visible])

  function finishSplash() {
    setHolding(true)
    window.setTimeout(() => setLeaving(true), 1_050)
    window.setTimeout(() => {
      sessionStorage.setItem(SPLASH_SEEN_KEY, 'yes')
      setVisible(false)
    }, 1_700)
  }

  function skipSplash() {
    sessionStorage.setItem(SPLASH_SEEN_KEY, 'yes')
    setVisible(false)
  }

  return <>
    {children}
    {visible && <div className={`cr-launch-splash${holding ? ' is-holding' : ''}${leaving ? ' is-leaving' : ''}`} role="status" aria-label={`CampusReserve for ${tenantBrand.name} is opening`}>
      <div className="cr-launch-surface">
        <video
          className="cr-launch-video"
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={productBrand.splashPosterUrl}
          onEnded={finishSplash}
          aria-hidden="true"
        >
          <source src={productBrand.splashVideoUrl} type="video/mp4" />
        </video>
        <div className="cr-launch-final" aria-hidden={!holding}>
          <BrandWordmark className="cr-launch-final-wordmark" tone="light" decorative />
          <div className="cr-launch-tenant">
            <span>for</span>
            <img src={tenantBrand.logoUrl} alt={tenantBrand.name} />
          </div>
        </div>
      </div>
      <button className="cr-launch-skip" type="button" onClick={skipSplash}>Skip</button>
    </div>}
  </>
}
