import { z } from 'zod'

/**
 * Client-input validation for the store-review write form — parallel to
 * lib/trustshop/write-schema.ts's reviewSubmitSchema, minus `productGid`.
 * `.strict()` guarantees a forged `buyer_verification` (or a `productGid`,
 * conflating this with a product review) is a hard validation failure.
 */
const honeypot = z.string().max(0).optional()

export const storeReviewSubmitSchema = z
  .object({
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

export type StoreReviewSubmitInput = z.infer<typeof storeReviewSubmitSchema>
