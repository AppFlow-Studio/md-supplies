type ShopifyRichTextNode = {
  type?: string
  value?: string
  children?: ShopifyRichTextNode[]
  bold?: boolean
}

function extractText(node: ShopifyRichTextNode): string {
  if (typeof node.value === 'string') return node.value
  if (!node.children) return ''
  return node.children.map(extractText).join('')
}

/**
 * Shopify's `rich_text_field` metafield type stores a JSON AST (root ->
 * paragraph/heading/list children -> text leaves), not plain text or HTML.
 * `custom.shipping_returns` (H-01) is this type, so it can't be handed
 * straight to resolveReturnPolicy's plain-text vendorPolicyText — this
 * flattens it to one plain-text block per top-level paragraph/heading, and
 * one per list item, with all inline formatting (bold/italic/links) stripped
 * to text. Malformed or non-JSON input degrades to an empty result rather
 * than throwing, matching resolveReturnPolicy's "never invented" fallback.
 */
export function shopifyRichTextToPlainParagraphs(raw: string | null | undefined): string[] {
  if (!raw) return []
  let root: ShopifyRichTextNode
  try {
    root = JSON.parse(raw)
  } catch {
    return []
  }

  const paragraphs: string[] = []
  const walk = (node: ShopifyRichTextNode) => {
    if (node.type === 'list' && node.children) {
      node.children.forEach(walk)
      return
    }
    const text = extractText(node).trim()
    if (text) paragraphs.push(text)
  }
  root.children?.forEach(walk)
  return paragraphs
}

export type RichTextSpan = { text: string; bold: boolean }

function extractSpans(node: ShopifyRichTextNode): RichTextSpan[] {
  if (typeof node.value === 'string') {
    return node.value ? [{ text: node.value, bold: Boolean(node.bold) }] : []
  }
  if (!node.children) return []
  return node.children.flatMap(extractSpans)
}

/**
 * Real custom.shipping_returns QA data (confirmed live 2026-08-19 via
 * scripts/verify-aerowalk-pinned-metafields.ts) stores what's visually two
 * paragraphs — a bold "Shipping Policy:" section and a bold "Return
 * Policy:" section — as literal blank lines inside ONE rich-text AST
 * paragraph node, not as two separate paragraph nodes. resolveReturnPolicy's
 * plain-text path already splits its flattened string on blank lines
 * (`text.split(/\n\s*\n/)`) for exactly this reason. Mirror that here on the
 * span level so bold spans still land in visually separate <p> blocks
 * instead of collapsing into one run-together paragraph.
 */
function splitSpansOnBlankLines(spans: RichTextSpan[]): RichTextSpan[][] {
  const groups: RichTextSpan[][] = [[]]
  for (const span of spans) {
    const pieces = span.text.split(/\n\s*\n/)
    pieces.forEach((piece, i) => {
      if (i > 0) groups.push([])
      if (piece) groups[groups.length - 1].push({ text: piece, bold: span.bold })
    })
  }
  return groups.filter((g) => g.some((s) => s.text.trim()))
}

/**
 * Same paragraph/list-item flattening as shopifyRichTextToPlainParagraphs,
 * but preserves bold marks as spans instead of discarding them — for the one
 * caller (Vendor Shipping & Returns) that needs safe bold rendering.
 * Italic/links stay stripped to plain text (not requested); only bold is
 * carried through, so the render side stays a narrow, safe <strong>-only path.
 */
export function shopifyRichTextToParagraphSpans(raw: string | null | undefined): RichTextSpan[][] {
  if (!raw) return []
  let root: ShopifyRichTextNode
  try {
    root = JSON.parse(raw)
  } catch {
    return []
  }

  const paragraphs: RichTextSpan[][] = []
  const walk = (node: ShopifyRichTextNode) => {
    if (node.type === 'list' && node.children) {
      node.children.forEach(walk)
      return
    }
    const spans = extractSpans(node)
    paragraphs.push(...splitSpansOnBlankLines(spans))
  }
  root.children?.forEach(walk)
  return paragraphs
}
