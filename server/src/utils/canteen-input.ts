import { z } from 'zod'

const screenshot = z.string().max(950_000).refine((value) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value), 'Upload a JPEG, PNG or WebP payment screenshot.').optional()

export const canteenOrderCreateSchema = z.object({
  items: z.array(z.object({ itemId: z.uuid(), quantity: z.number().int().min(1).max(30), customization: z.string().trim().max(160).optional() })).min(1).max(20),
  deliveryLocation: z.string().trim().min(3).max(220),
  deliveryAt: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(['UPI', 'CASH_ON_DELIVERY']),
  upiReference: z.string().trim().max(80).optional(),
  paymentScreenshotDataUrl: screenshot,
}).superRefine((value, context) => {
  if (value.paymentMethod === 'UPI' && !value.upiReference) context.addIssue({ code: 'custom', path: ['upiReference'], message: 'Enter the UPI transaction reference.' })
})

export const canteenItemSchema = z.object({
  name: z.string().trim().min(2).max(120), description: z.string().trim().min(2).max(500), category: z.string().trim().min(2).max(80),
  pricePaise: z.number().int().min(100).max(100_000), imageUrl: z.url().optional().or(z.literal('')), options: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  status: z.enum(['AVAILABLE', 'SOLD_OUT', 'INACTIVE']).default('AVAILABLE'), sortOrder: z.number().int().min(0).max(10_000).default(0),
})

export const canteenOrderUpdateSchema = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING_VERIFICATION', 'PAY_ON_DELIVERY', 'PAID', 'VERIFICATION_FAILED']).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
}).refine((value) => value.status || value.paymentStatus, 'Choose an order or payment update.')
