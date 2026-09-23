/**
 * Bilal, 2026-09-14 (B2080C title bug): the Shopify title bakes in ONE
 * variant's SKU as a trailing "(SKU)" suffix — correct for that variant,
 * wrong once a sibling variant (different SKU) is selected. Izzy: "there is
 * a field for the SKU, just trim that value off the title" — the SKU is
 * already known per-variant, so the storefront can strip/replace the suffix
 * itself rather than Izzy maintaining per-variant title text.
 *
 * Never hardcode a SKU and never blindly strip any parenthetical (legitimate
 * text like "(Sterile)" must survive) — only treat a trailing "(...)" as a
 * baked-in SKU suffix when its content exactly matches one of THIS product's
 * own variant SKUs. A product with fewer than two distinct variant SKUs has
 * nothing to disambiguate, so its title is returned unchanged (covers both
 * "no variant SKUs" and "only one real SKU across variants").
 *
 * 2026-09-15 (B6705 follow-up): some catalog titles bake in a truncated SKU
 * that's missing a trailing code letter the real variant SKU has (title
 * "(B6705)", live SKU "B6705C") — a data-entry gap, not a different naming
 * scheme. Treat the suffix as the same baked-in SKU when it's a strict
 * prefix of exactly one distinct variant SKU, so the ambiguous case (the
 * prefix could belong to two different variants) still falls through
 * untouched rather than guessing.
 *
 * 2026-09-22 (Sardor's audit, 15015-24DELR case): a handful of titles bake the
 * SKU in TWICE — once inline and once as the parenthetical, e.g. "Bariatric
 * Reclining Wheelchair w/ ELR 15015-24DELR (15015-24DELR)". Replacing only the
 * parenthetical left the inline copy stale, so selecting the 26" variant
 * rendered a title that named one SKU and parenthesised another. A catalog-wide
 * sweep of all 7,230 live products found exactly 10 of these, and every one has
 * the same shape: the inline copy is the LAST thing in the base title and is
 * character-identical to the parenthetical. So the repeat is stripped rather
 * than rewritten — "… w/ ELR (15015-26DELR)" reads better than repeating the
 * same code twice — and only ever when it trails, so a mid-title model
 * designation ("9501 Series, …") can never be touched.
 */
export function resolveVariantAwareTitle(
  title: string,
  variants: { sku?: string | null }[],
  selectedVariant: { sku?: string | null },
): string {
  const variantSkus = variants
    .map((v) => v.sku)
    .filter((sku): sku is string => !!sku)
  const uniqueSkus = new Set(variantSkus)
  if (uniqueSkus.size < 2) return title

  const match = title.match(/^(.*\S)\s*\(([^()]+)\)\s*$/)
  if (!match) return title
  const [, baseTitle, suffix] = match

  const isExactSku = variantSkus.includes(suffix)
  const prefixCandidates = new Set(
    variantSkus.filter((sku) => sku !== suffix && sku.startsWith(suffix)),
  )
  if (!isExactSku && prefixCandidates.size !== 1) return title

  const cleanedBase = stripTrailingSkuRepeat(baseTitle, suffix)
  return selectedVariant.sku ? `${cleanedBase} (${selectedVariant.sku})` : cleanedBase
}

/** True when `char` is not a letter or digit (or is absent). */
function isBoundary(char: string | undefined): boolean {
  return char === undefined || !/[A-Za-z0-9]/.test(char)
}

/**
 * Removes a trailing repeat of the baked-in SKU from the base title, with the
 * separator that introduced it (", 10379" → "", " 15015-24DELR" → "").
 *
 * Deliberately narrow, because this runs over the whole catalog:
 *
 * - Only a TRAILING occurrence is considered. "9501 Series, Physician Stool…"
 *   must never lose its model-family name, and a mid-title code is far more
 *   likely to be meaningful product text than a duplicated suffix.
 * - The match must be the WHOLE token — "10379" inside "103790" is not a
 *   repeat, so the preceding character must not be alphanumeric.
 * - If stripping would leave nothing descriptive behind (a title that was only
 *   ever the SKU), the original base is kept: a bare "(SKU)" is worse than a
 *   redundant one.
 */
function stripTrailingSkuRepeat(baseTitle: string, sku: string): string {
  if (!sku || !baseTitle.endsWith(sku)) return baseTitle
  const start = baseTitle.length - sku.length
  if (!isBoundary(baseTitle[start - 1])) return baseTitle

  // Drop the code, then the separator that introduced it (a comma, dash or
  // whitespace). Anything else — "w/", ")" — is real title text and stays.
  const remainder = baseTitle.slice(0, start).replace(/[\s,–—-]+$/, '')
  return remainder.length > 0 && /[A-Za-z]/.test(remainder) ? remainder : baseTitle
}
