/**
 * GTIN normalization for Product schema (M5).
 *
 * Shopify's variant `barcode` field is free text and, in this catalog, is
 * mostly junk — a live sample showed ~40% of products carry a barcode but
 * only ~6% of those are GTIN-shaped (the rest are SKU copies like "B6819").
 * Emitting a fake GTIN is worse than none: Google flags mismatched GTINs and
 * can suppress the whole merchant listing. So a barcode becomes `gtin` only
 * when it has a valid GTIN length AND its GS1 mod-10 check digit verifies.
 */

/** GS1 check-digit verification (works for GTIN-8/12/13/14). */
function hasValidCheckDigit(digits: string): boolean {
  const nums = digits.split('').map(Number)
  const check = nums.pop()!
  const sum = nums
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

/**
 * Returns the barcode as a GTIN string when it is a plausible, checksum-valid
 * GTIN-8/12/13/14; otherwise undefined (fail closed — never fabricate).
 */
export function normalizeGtin(barcode: string | null | undefined): string | undefined {
  if (!barcode) return undefined
  const digits = barcode.replace(/[\s-]/g, '')
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return undefined
  if (!hasValidCheckDigit(digits)) return undefined
  return digits
}
