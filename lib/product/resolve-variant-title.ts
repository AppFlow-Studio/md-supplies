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

  return selectedVariant.sku ? `${baseTitle} (${selectedVariant.sku})` : baseTitle
}
