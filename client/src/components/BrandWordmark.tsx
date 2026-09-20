type BrandWordmarkProps = {
  className?: string
  decorative?: boolean
  tone?: 'auto' | 'light' | 'dark'
}

import { productBrand } from '../branding/tenant'

export default function BrandWordmark({ className = '', decorative = false, tone = 'auto' }: BrandWordmarkProps) {
  return (
    <span
      className={`cr-brand-wordmark cr-brand-wordmark-${tone} ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'CampusReserve'}
      aria-hidden={decorative || undefined}
    >
      <img className="cr-brand-wordmark-dark-ink" src={productBrand.wordmarkDarkUrl} alt="" draggable="false" />
      <img className="cr-brand-wordmark-light-ink" src={productBrand.wordmarkUrl} alt="" draggable="false" />
    </span>
  )
}
