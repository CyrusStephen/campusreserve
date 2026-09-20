type BrandLogoProps = {
  className?: string
  decorative?: boolean
}

import { productBrand } from '../branding/tenant'

export default function BrandLogo({ className = '', decorative = false }: BrandLogoProps) {
  return (
    <img
      className={`cr-brand-logo ${className}`.trim()}
      src={productBrand.markUrl}
      alt={decorative ? '' : 'CampusReserve'}
      aria-hidden={decorative || undefined}
      draggable="false"
    />
  )
}
