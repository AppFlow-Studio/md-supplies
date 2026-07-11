/**
 * Trims text to at most `maxLength` characters without cutting mid-word.
 * Used to cap meta descriptions when the Shopify `seo.description` enrichment
 * field is unavailable and we must fall back to raw body copy.
 */
export function trimDescription(text: string, maxLength = 155): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed

  const sliced = trimmed.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(' ')
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trimEnd()
}
