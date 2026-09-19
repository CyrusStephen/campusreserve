export const MAX_PHOTOS = 8
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024
export const photoFilenamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/

// The browser decodes and re-encodes selected JPEG/PNG/WebP files as JPEG.
// This check bounds dimensions and rejects arbitrary uploads. Files are served
// only as image/jpeg with nosniff, never as HTML/SVG or executable content.
export function inspectJpeg(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 12 || bytes.length > MAX_PHOTO_BYTES) return null
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null
  let offset = 2
  let dimensions: { width: number; height: number } | null = null
  let hasQuantizationTable = false
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return null
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === undefined || marker === 0xd9) return null
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    const high = bytes[offset]
    const low = bytes[offset + 1]
    if (high === undefined || low === undefined) return null
    const length = high * 256 + low
    if (length < 2 || offset + length > bytes.length) return null
    if (marker === 0xdb) hasQuantizationTable = true
    if (marker === 0xda) {
      return dimensions && hasQuantizationTable && length >= 6 && offset + length < bytes.length - 2 ? dimensions : null
    }
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const components = bytes[offset + 7]
      if (length < 11 || bytes[offset + 2] !== 8 || !components || ![1, 3].includes(components) || length !== 8 + 3 * components) return null
      const height = bytes[offset + 3]! * 256 + bytes[offset + 4]!
      const width = bytes[offset + 5]! * 256 + bytes[offset + 6]!
      if (width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > 16_000_000) return null
      dimensions = { width, height }
    }
    offset += length
  }
  return null
}

export function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.port && host.includes('.') && !host.endsWith('.') &&
      !host.endsWith('.localhost') && !host.endsWith('.local') &&
      !host.endsWith('.internal') && !host.includes(':') &&
      !/^\d+(?:\.\d+){3}$/.test(host)
  } catch {
    return false
  }
}
