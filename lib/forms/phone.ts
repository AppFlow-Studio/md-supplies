import { parsePhoneNumberFromString } from 'libphonenumber-js'

const NANP_COUNTRIES = new Set(['US', 'CA'])

/**
 * True for an empty/absent phone (still optional) or a real, dialable
 * US/Canadian (NANP) number — not just something that matches a digit regex.
 */
export function isValidNanpPhone(phone: string): boolean {
  if (!phone.trim()) return true
  const parsed = parsePhoneNumberFromString(phone, { defaultCountry: 'US' })
  return !!parsed && parsed.isValid() && NANP_COUNTRIES.has(parsed.country ?? '')
}
