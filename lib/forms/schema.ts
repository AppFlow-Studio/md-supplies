import { z } from 'zod'

/**
 * Single source of truth for the contact + sourcing forms.
 *
 * The same constants and schemas are imported by the client components, the API
 * route handlers, and the tests so the `<select>` options, the server-side enum
 * validation, and the test fixtures can never drift apart.
 */

export const FACILITY_TYPES = [
  'Urgent Care Center',
  'Hospital / Health System',
  'HRT / Wellness Clinic',
  'Home Care Agency',
  'EMS / First Responder',
  'Pharmacy',
  'Physical Therapy',
  'Other',
] as const

export const SUBJECTS = [
  'General inquiry',
  'Product availability',
  'Bulk order pricing',
  'Order support',
  'Returns & refunds',
  'Other',
] as const

/**
 * Honeypot: a hidden `website` field real users never see. Bots that fill every
 * input trip it. It must be absent or empty — anything else fails validation.
 */
const honeypot = z.string().max(0).optional()

const baseFields = {
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.email('Enter a valid email').max(254, 'Email is too long'),
  phone: z
    .string()
    .trim()
    .max(40, 'Phone is too long')
    .regex(/^[0-9+()\-.\s]*$/, 'Phone contains invalid characters')
    .optional(),
  website: honeypot,
}

export const sourcingSchema = z
  .object({
    ...baseFields,
    facultyType: z.enum(FACILITY_TYPES, { message: 'Choose a faculty type' }),
  })
  .strict()

export const contactSchema = z
  .object({
    ...baseFields,
    // The client sends '' when no subject is chosen; treat that as "no subject".
    subject: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.enum(SUBJECTS).optional(),
    ),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(5000, 'Message is too long'),
  })
  .strict()

export type SourcingInput = z.infer<typeof sourcingSchema>
export type ContactInput = z.infer<typeof contactSchema>
