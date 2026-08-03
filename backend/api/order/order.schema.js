import { z } from 'zod'
import { ORDER_STATUSES } from './order.service.js'

/**
 * No items and no totals. The order is built from the server-side cart and
 * priced from the catalogue — accepting either from the client would let a
 * shopper name their own price.
 */
export const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullname: z.string().trim().min(2, 'Full name is required').max(80),
    phone: z
      .string()
      .trim()
      .min(9, 'Phone number is too short')
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, 'Phone number contains invalid characters'),
    city: z.string().trim().min(1, 'City is required').max(60),
    street: z.string().trim().min(1, 'Street is required').max(120),
    houseNumber: z.string().trim().max(20).optional(),
    floor: z.string().trim().max(20).optional(),
    apartment: z.string().trim().max(20).optional(),
    zip: z.string().trim().max(20).optional(),
  }),
  paymentMethod: z.enum(['simulated', 'card', 'cash']).default('simulated'),
  notes: z.string().trim().max(500).optional().default(''),
})

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
})
