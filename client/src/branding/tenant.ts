const configuredName = import.meta.env.VITE_TENANT_NAME?.trim()
const configuredLogo = import.meta.env.VITE_TENANT_LOGO_URL?.trim()

export const tenantBrand = {
  name: configuredName || 'St Berchmans College',
  logoUrl: configuredLogo || '/branding/st-berchmans-college.png',
}

export const productBrand = {
  markUrl: '/campusreserve-logo.png',
  wordmarkUrl: '/branding/campusreserve-wordmark-refined-night.svg',
  wordmarkDarkUrl: '/branding/campusreserve-wordmark-refined-dark.svg',
  splashVideoUrl: '/branding/campusreserve-splash-final.mp4',
  splashPosterUrl: '/branding/campusreserve-wordmark-hold.jpg',
}
