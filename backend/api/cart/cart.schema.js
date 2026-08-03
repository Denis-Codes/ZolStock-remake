import { z } from 'zod'

// Note the absence of any price field. Prices are resolved server-side from
// the catalogue; a client that sends one is ignored.
const variantSchema = z
  .object({
    size: z.string().trim().max(40).optional(),
    color: z.string().trim().max(40).optional(),
  })
  .nullable()
  .optional()

export const addItemSchema = z.object({
  productId: z.string().trim().min(1, 'productId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99).default(1),
  variant: variantSchema,
})

export const updateQtySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative').max(99),
})

export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99).default(1),
        variant: variantSchema,
      })
    )
    .max(100, 'Too many items to merge')
    .default([]),
})
