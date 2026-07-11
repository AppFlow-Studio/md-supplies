/**
 * Trim free-form text to a meta-description length, cutting at a word
 * boundary so descriptions never end mid-word. Collapses whitespace first
 * (Shopify descriptions often contain newlines/double spaces).
 */
export function trimDescription(text: string, maxLength = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  const cut = clean.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`
}
