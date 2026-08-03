import { z } from 'zod'

/**
 * `score` is intentionally absent. The frontend's user.service sends
 * { _id, score } on update, but letting a client set its own balance is the
 * same class of bug as letting it set isAdmin — it is server-owned state.
 * Adjusting score is an admin action, handled separately below.
 *
 * `isAdmin`, `username` and `password` are likewise not updatable here.
 */
export const updateUserSchema = z.object({
  _id: z.string().trim().min(1).optional(),
  fullname: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name must be at most 80 characters')
    .optional(),
  imgUrl: z.string().trim().url('Image URL must be a valid URL').optional(),
  // Only honoured when the caller is an admin; the controller drops it otherwise.
  score: z.number().int().min(0).max(1_000_000).optional(),
})
