import { z } from 'zod'

export const PUBLIC_DISPLAY_CLASSES = [
  'standard-free',
  'threshold',
  'standard-paid',
  'manual-quote',
  'unknown',
] as const

const publicDisplayClassSchema = z.enum(PUBLIC_DISPLAY_CLASSES)

const variantRecordSchema = z
  .object({
    sku: z.string().nullable(),
    effective_rate_class: z.enum(['FREE', 'THRESHOLD', 'PAID', 'COND_PAID']).nullable(),
    diagnostic_status: z.string(),
    public_display_class: publicDisplayClassSchema,
    display_copy: z.string().nullable(),
  })
  .passthrough()

const productRecordSchema = z
  .object({
    handle: z.string(),
    title: z.string(),
    diagnostic_status: z.string(),
    public_display_class: publicDisplayClassSchema,
    display_copy: z.string().nullable(),
    hold: z.boolean(),
    hold_reason: z.string().nullable(),
    canada_status: z.string(),
    variants: z.record(z.string(), variantRecordSchema),
  })
  .passthrough()

export const shippingFactsSchema = z
  .object({
    _meta: z.object({ schema_version: z.string() }).passthrough(),
    delivery_profiles: z.array(z.unknown()),
    products: z.record(z.string(), productRecordSchema),
  })
  .passthrough()

export type PublicDisplayClass = z.infer<typeof publicDisplayClassSchema>
export type VariantRecord = z.infer<typeof variantRecordSchema>
export type ProductRecord = z.infer<typeof productRecordSchema>
export type ShippingFactsPayload = z.infer<typeof shippingFactsSchema>
