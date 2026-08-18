type ShopifyRichTextNode = {
  type?: string
  value?: string
  bold?: boolean
  children?: ShopifyRichTextNode[]
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
    if (spans.some((s) => s.text.trim())) paragraphs.push(spans)
  }
  root.children?.forEach(walk)
  return paragraphs
}
