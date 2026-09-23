/**
 * Bilal, 2026-08-14 (Sardor task 4): "selected variant value first; shared
 * product value only when the variant value is blank and a shared fallback
 * is valid." Used for Order Size / Units per Order, where a genuinely
 * shared product-level value is a valid display (most variants inherit
 * shared packaging) — always returns a value to render, never a redundancy
 * check.
 *
 * Bilal, 2026-08-20 (code review on #64): the product-level fallback is only
 * safe when it "applies to every variant" — if a sibling variant explicitly
 * carries a different value, packaging isn't uniform, and a blank variant
 * must not silently inherit another variant's quantity. `siblingValues`
 * (every variant's own value for this field, blank variant's own value
 * included and harmless) drives that check; omit it to keep the old
 * unconditional-fallback behavior for callers that haven't been updated.
 */
export function resolveVariantValue(
  variantValue: string | null | undefined,
  productValue: string | null | undefined,
  siblingValues?: Array<string | null | undefined>,
): string | null {
  if (variantValue) return variantValue
  if (!productValue) return null
  const conflictsWithProductValue = (siblingValues ?? []).some(
    (value) => value && value !== productValue,
  )
  if (conflictsWithProductValue) return null
  return productValue
}
