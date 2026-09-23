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
 * 2026-09-23 (Izzy's 983-product report, 15015-24DELR case): some titles bake
 * the same SKU in more than once — typically inline AND parenthesised, e.g.
 * "…w/ ELR 15015-24DELR (15015-24DELR)". Rewriting only the parenthetical left
 * the inline copy stale, so a selected 26" variant rendered a title naming one
 * SKU and parenthesising another. Once the candidate has been identified by
 * the safe rules above, EVERY whole-token occurrence of it is rewritten, not
 * just the trailing one.
 *
 * The identification rules are untouched — this only widens what happens after
 * a candidate has already been accepted. Ambiguous candidates, template
 * placeholders ("9501-xx") and non-SKU parentheticals ("(US Only)") still fall
 * through exactly as before, because they never reach the replacement step.
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

  // No SKU to substitute: drop the baked-in code wherever it appears rather
  // than leaving a stale one behind, then tidy the separator it left.
  if (!selectedVariant.sku) {
    return tidySeparators(replaceTokenOccurrences(baseTitle, suffix, '')) || baseTitle
  }

  return replaceTokenOccurrences(title, suffix, selectedVariant.sku)
}

/** True when `char` is absent or is not a letter/digit. */
function isTokenBoundary(char: string | undefined): boolean {
  return char === undefined || !/[A-Za-z0-9]/.test(char)
}

/**
 * Replaces every whole-token occurrence of `token`, comparing literally.
 *
 * Deliberately not a RegExp: SKUs routinely contain characters with regex
 * meaning (".", "-", "+", "/", "(") and building a pattern from catalog data
 * is how an unescaped token turns into a wrong match or a thrown error. A
 * literal scan cannot misinterpret any character.
 *
 * A match only counts when neither neighbouring character is alphanumeric, so
 * "10690" inside "X10690A" is left alone — that is a different identifier, not
 * a repeat of the baked-in SKU.
 */
function replaceTokenOccurrences(text: string, token: string, replacement: string): string {
  if (!token) return text
  let out = ''
  let i = 0
  for (;;) {
    const at = text.indexOf(token, i)
    if (at === -1) return out + text.slice(i)
    const before = at === 0 ? undefined : text[at - 1]
    const after = text[at + token.length]
    if (isTokenBoundary(before) && isTokenBoundary(after)) {
      out += text.slice(i, at) + replacement
      i = at + token.length
    } else {
      out += text.slice(i, at + token.length)
      i = at + token.length
    }
  }
}

/** Collapses the whitespace/punctuation a removed token leaves behind. */
function tidySeparators(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;])/g, '$1')
    .replace(/[\s,;–—-]+$/, '')
    .trim()
}
