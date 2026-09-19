import assert from 'node:assert/strict'
import test from 'node:test'
import { canteenItemSchema, canteenOrderCreateSchema, canteenOrderUpdateSchema } from '../src/utils/canteen-input.js'

const base = { items: [{ itemId: 'f1ec5f5a-4f3b-4d4d-a21e-d17bea1c33bf', quantity: 2, customization: 'Without sugar' }], deliveryLocation: 'Computer Science office, Room 12', deliveryAt: new Date(Date.now() + 3_600_000).toISOString() }
test('accepts a fast cash-on-delivery order', () => assert.equal(canteenOrderCreateSchema.parse({ ...base, paymentMethod: 'CASH_ON_DELIVERY' }).paymentMethod, 'CASH_ON_DELIVERY'))
test('requires a transaction reference for UPI', () => assert.throws(() => canteenOrderCreateSchema.parse({ ...base, paymentMethod: 'UPI' })))
test('accepts UPI with an optional screenshot omitted', () => assert.equal(canteenOrderCreateSchema.parse({ ...base, paymentMethod: 'UPI', upiReference: '123456789012' }).upiReference, '123456789012'))
test('rejects unreasonable quantities', () => assert.throws(() => canteenOrderCreateSchema.parse({ ...base, paymentMethod: 'CASH_ON_DELIVERY', items: [{ ...base.items[0], quantity: 31 }] })))
test('validates menu prices and fulfilment updates', () => { assert.equal(canteenItemSchema.parse({ name: 'Tea', description: 'Fresh tea', category: 'Drinks', pricePaise: 1200 }).status, 'AVAILABLE'); assert.equal(canteenOrderUpdateSchema.parse({ status: 'PREPARING' }).status, 'PREPARING') })
