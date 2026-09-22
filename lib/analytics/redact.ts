/**
 * Strips identifiers out of free-text values before they reach analytics.
 *
 * Applies to anything a customer can type that we then report on — today the
 * search term, which also becomes `item_list_name` on the search results'
 * `view_item_list`. Customers do paste email addresses and phone numbers into
 * site search, and Google's Analytics terms prohibit sending PII to GA4
 * (support.google.com/analytics/answer/6366371). Once such a hit is recorded
 * there is no way to remove it from the property, so the guard belongs at the
 * point of emission rather than in a GTM filter that lives outside this repo.
 *
 * Deliberately conservative — it redacts rather than drops, so a legitimate
 * search with an unusual shape still reports as a search.
 */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
// 7+ digits with optional separators: long enough to exclude catalogue codes
// and SKUs (which customers legitimately search) and order quantities.
const PHONE = /(?:\+?\d[\s().-]?){7,}\d/g

export function redactPii(value: string): string {
  return value.replace(EMAIL, '[redacted]').replace(PHONE, '[redacted]')
}

/** Trims, collapses whitespace, caps length, and redacts. */
export function normalizeSearchTerm(raw: string): string {
  return redactPii(raw.trim().replace(/\s+/g, ' ').slice(0, 100))
}
