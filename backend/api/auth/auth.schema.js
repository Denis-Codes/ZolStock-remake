import { z } from 'zod'

/**
 * Note what is absent: `isAdmin`, `score`, and `_id`.
 *
 * The signup handler previously spread req.body into the new user document,
 * so posting `{"isAdmin": true}` created an administrator. Because the
 * validate middleware replaces the body with the parsed object, any field not
 * declared here is stripped before it can reach the database.
 *
 * `score` is likewise server-assigned; the frontend sends 10000 on signup but
 * a client must not be able to choose its own balance.
 */
export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(40, 'Username must be at most 40 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(200, 'Password must be at most 200 characters'),
  fullname: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name must be at most 80 characters'),
  imgUrl: z.string().trim().url('Image URL must be a valid URL').optional(),
})

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
