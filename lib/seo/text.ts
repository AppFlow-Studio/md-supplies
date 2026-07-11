/**
 * Trims a description to fit within a meta-description budget.
 *
 * Google truncates SERP snippets around 155–160 characters, so callers pass a
 * `maxLength` (typically 155). Whitespace is collapsed first, then the string is
 * cut on a word boundary and an ellipsis is appended. Text already within budget
 * is returned untouched (no trailing ellipsis).
 */
export function trimDescription(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized

  // Reserve one character for the ellipsis.
  const sliced = normalized.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(' ')
  const trimmed = (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trimEnd()
  return `${trimmed}…`
}
