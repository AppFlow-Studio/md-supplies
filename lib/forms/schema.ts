import { z } from 'zod'
import { hasValidMxRecord } from './verify-email'
import { isValidNanpPhone } from './phone'
import { FACILITY_TYPES, SUBJECTS } from './constants'

// Re-exported so server-side callers/tests can keep importing everything from
// the schema module; client components import from './constants' directly.
export { FACILITY_TYPES, SUBJECTS }

/**
 * Single source of truth for the contact + sourcing forms.
 *
 * The same constants and schemas are imported by the client components, the API
 * route handlers, and the tests so the `<select>` options, the server-side enum
 * validation, and the test fixtures can never drift apart.
 */

/**
 * Honeypot: a hidden `website` field real users never see. Bots that fill every
 * input trip it. It must be absent or empty — anything else fails validation.
 */
const honeypot = z.string().max(0).optional()

const baseFields = {
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z
    .email('Enter a valid email')
    .max(254, 'Email is too long')
    .refine(hasValidMxRecord, 'This email address does not appear to be deliverable'),
  phone: z
    .string()
    .trim()
    .max(40, 'Phone is too long')
    .regex(/^[0-9+()\-.\s]*$/, 'Phone contains invalid characters')
    .optional()
    .refine(
      (v) => v === undefined || isValidNanpPhone(v),
      'Enter a valid US or Canadian phone number',
    ),
  website: honeypot,
  // Client-reported ms since the form rendered — the time-trap anti-bot
  // signal consumed by `isSubmittedTooFast` in lib/forms/guards.ts.
  elapsedMs: z.number().optional(),
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
