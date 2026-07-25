/**
 * Form enum constants shared by the client components (select options) and the
 * server-side schemas. They live apart from `schema.ts` because the schemas
 * pull in `node:dns/promises` for MX verification — a server-only module the
 * client bundle must never import.
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
  'Pricing question',
  'Order support',
  'Returns & refunds',
  'Other',
] as const
