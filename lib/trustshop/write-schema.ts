import { z } from 'zod'

/**
 * Client-input validation for the product-review write form. `.strict()`
 * guarantees a forged `buyer_verification` (or any other unexpected field —
 * a client-supplied `product_id` included) is a hard validation failure, not
 * a silently-dropped extra key: TrustShop owns verification, and the
 * product identity comes from the PDP's own server-rendered `productGid`
 * prop, never a client-editable numeric field.
 */
const honeypot = z.string().max(0).optional()

export const reviewSubmitSchema = z
  .object({
    productGid: z.string().trim().min(1, 'Missing product reference'),
    star: z.number().int('Rating must be a whole number').min(1, 'Choose a rating').max(5, 'Choose a rating'),
    title: z.string().trim().max(100, 'Title is too long').optional(),
    content: z
      .string()
      .trim()
      .min(1, 'Review is required')
      .max(4000, 'Review is too long'),
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    email: z.email('Enter a valid email').max(254, 'Email is too long'),
    website: honeypot,
    elapsedMs: z.number().optional(),
  })
  .strict()

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>
