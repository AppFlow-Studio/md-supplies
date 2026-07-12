/**
 * Shopify-sourced product image alts all end in a formulaic " medical supply"
 * suffix (bulk-import keyword padding) that reads as spam to screen readers.
 * The durable fix is editing the alt data in Shopify (owned by Izzy); until
 * that lands, strip the suffix at render time. Harmless once the data is
 * cleaned — the regex simply stops matching.
 */
export function cleanShopifyAlt(alt: string | null | undefined): string | null {
  if (!alt) return null
  const cleaned = alt.replace(/[\s,-]*medical suppl(?:y|ies)\s*$/i, '').trim()
  return cleaned || null
}
