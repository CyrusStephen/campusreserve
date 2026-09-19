import { apiRequest } from '../auth/api'
import type { CanteenItem, CanteenOrder } from './types'

type Envelope<T> = { status: 'ok'; data: T }
export const listCanteenItems = () => apiRequest<Envelope<CanteenItem[]>>('/canteen/items').then((value) => value.data)
export const listMyCanteenOrders = () => apiRequest<Envelope<CanteenOrder[]>>('/canteen/orders/mine').then((value) => value.data)
export const createCanteenOrder = (body: object) => apiRequest<Envelope<CanteenOrder>>('/canteen/orders', { method: 'POST', body: JSON.stringify(body) }).then((value) => value.data)
export const listCanteenOrders = () => apiRequest<Envelope<CanteenOrder[]>>('/canteen/manage/orders').then((value) => value.data)
export const updateCanteenOrder = (id: string, body: object) => apiRequest<Envelope<CanteenOrder>>(`/canteen/manage/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then((value) => value.data)
export const listManagedCanteenItems = () => apiRequest<Envelope<CanteenItem[]>>('/canteen/manage/items').then((value) => value.data)
export const saveCanteenItem = (item: Partial<CanteenItem> & { id?: string }) => { const { id, ...body } = item; return apiRequest<Envelope<CanteenItem>>(id ? `/canteen/manage/items/${id}` : '/canteen/manage/items', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }).then((value) => value.data) }
