import { apiRequest } from '../auth/api'
import type { Resource, ResourceBlock, ResourceBlockInput, ResourceInput, ResourceScope } from './types'

interface ApiResult<T> { status: 'ok'; data: T }
export interface ResourceList { resources: Resource[]; total: number; page: number; pageSize: number }

export async function listResources(scope: ResourceScope, query: string, type: string, page: number, signal: AbortSignal) {
  const params = new URLSearchParams({ scope, q: query, page: String(page), pageSize: '12' })
  if (type) params.set('type', type)
  return (await apiRequest<ApiResult<ResourceList>>(`/resources?${params}`, { signal })).data
}

export async function getResource(id: string, signal?: AbortSignal): Promise<Resource> {
  return (await apiRequest<ApiResult<Resource>>(`/resources/${encodeURIComponent(id)}`, signal ? { signal } : {})).data
}

export async function saveResource(input: ResourceInput, current: Resource | null): Promise<Resource> {
  return (await apiRequest<ApiResult<Resource>>(current ? `/resources/${current.id}` : '/resources', {
    method: current ? 'PUT' : 'POST',
    body: JSON.stringify(current ? { ...input, revision: current.revision } : input),
  })).data
}

export async function uploadPhoto(resource: Resource, file: Blob, altText: string) {
  return (await apiRequest<ApiResult<Resource>>(`/resources/${resource.id}/photos?${new URLSearchParams({ alt: altText })}`, {
    method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Resource-Revision': String(resource.revision) }, body: file,
  })).data
}

export async function updatePhoto(resource: Resource, photoId: string, altText: string, cover: boolean) {
  return (await apiRequest<ApiResult<Resource>>(`/resources/${resource.id}/photos/${photoId}`, {
    method: 'PATCH', body: JSON.stringify({ revision: resource.revision, altText, cover }),
  })).data
}

export async function removePhoto(resource: Resource, photoId: string) {
  return (await apiRequest<ApiResult<Resource>>(`/resources/${resource.id}/photos/${photoId}`, {
    method: 'DELETE', body: JSON.stringify({ revision: resource.revision }),
  })).data
}

export async function createCampusBlock(resourceId: string, input: ResourceBlockInput): Promise<ResourceBlock> {
  return (await apiRequest<ApiResult<ResourceBlock>>(`/resources/${encodeURIComponent(resourceId)}/blocks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })).data
}

export async function removeCampusBlock(resourceId: string, blockId: string): Promise<void> {
  await apiRequest<ApiResult<{ id: string }>>(`/resources/${encodeURIComponent(resourceId)}/blocks/${encodeURIComponent(blockId)}`, {
    method: 'DELETE',
  })
}

export async function preparePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.')
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Try a different photo.') })
  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo preparation is unavailable in this browser.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not prepare the photo.')), 'image/jpeg', 0.85)
    })
    if (blob.size > 3 * 1024 * 1024) throw new Error('This photo is still too large after compression. Try a smaller image.')
    return blob
  } finally { bitmap.close() }
}
