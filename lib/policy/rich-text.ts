type ShopifyRichTextNode = {
  type?: string
  value?: string
  children?: ShopifyRichTextNode[]
  bold?: boolean
  italic?: boolean
  level?: number
  listType?: string
  url?: string
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only http(s)/mailto and relative links are allowed through as `href` — anything else (e.g. `javascript:`) degrades to "#" rather than being trusted into innerHTML. */
function safeHref(url: string): string {
  if (url.startsWith('/') || url.startsWith('#')) return escapeHtml(url)
  try {
    const parsed = new URL(url)
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return escapeHtml(url)
  } catch {
    // fall through to '#'
  }
  return '#'
}

type RichTextInline =
  | { kind: 'text'; text: string; bold: boolean; italic: boolean }
  | { kind: 'link'; url: string; text: string; bold: boolean; italic: boolean }

function extractInlines(node: ShopifyRichTextNode, bold = false, italic = false): RichTextInline[] {
  const isBold = bold || Boolean(node.bold)
  const isItalic = italic || Boolean(node.italic)
  if (node.type === 'link' && node.url) {
    const text = extractText(node)
    return text ? [{ kind: 'link', url: node.url, text, bold: isBold, italic: isItalic }] : []
  }
  if (typeof node.value === 'string') {
    return node.value ? [{ kind: 'text', text: node.value, bold: isBold, italic: isItalic }] : []
  }
  if (!node.children) return []
  return node.children.flatMap((child) => extractInlines(child, isBold, isItalic))
}

/** Mirrors splitSpansOnBlankLines above, for RichTextInline — real rich_text_field QA data stores visually-separate paragraphs as blank lines inside one AST paragraph/heading node. */
function splitInlinesOnBlankLines(inlines: RichTextInline[]): RichTextInline[][] {
  const groups: RichTextInline[][] = [[]]
  for (const inline of inlines) {
    if (inline.kind !== 'text') {
      groups[groups.length - 1].push(inline)
      continue
    }
    const pieces = inline.text.split(/\n\s*\n/)
    pieces.forEach((piece, i) => {
      if (i > 0) groups.push([])
      if (piece) groups[groups.length - 1].push({ ...inline, text: piece })
    })
  }
  return groups.filter((g) => g.some((s) => s.text.trim()))
}

function renderInline(inline: RichTextInline): string {
  const escapedText = escapeHtml(inline.text).replace(/\n/g, '<br/>')
  let html =
    inline.kind === 'link'
      ? `<a href="${safeHref(inline.url)}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`
      : escapedText
  if (inline.italic) html = `<em>${html}</em>`
  if (inline.bold) html = `<strong>${html}</strong>`
  return html
}

function renderInlineGroup(inlines: RichTextInline[]): string {
  return inlines.map(renderInline).join('')
}

// Rich text headings render inside a page section that already has its own
// "Description" <h2>, so AST heading levels are clamped to h3-h6 rather than
// rendered verbatim — avoids an archived h1/h2 outranking the page's own
// section heading.
function clampHeadingLevel(level: number | undefined): number {
  return Math.min(6, Math.max(3, level ?? 3))
}

/**
 * Converts a Shopify rich_text_field JSON AST directly to sanitized HTML
 * (paragraphs, headings, ordered/unordered lists, bold/italic, links),
 * instead of flattening it to plain text. For custom.variant_description:
 * client feedback (2026-09-17) was that flattening to plain paragraphs
 * unnecessarily degrades recovered archived descriptions that carried real
 * formatting. All text content is HTML-escaped and link hrefs are
 * protocol-checked (safeHref) before being placed in the output string, so
 * the result is safe to pass straight to dangerouslySetInnerHTML.
 * Returns null for null/undefined/empty input, unparseable JSON, or an AST
 * with no renderable content — callers fall back to their own plain-text
 * handling in that case (see plainTextToHtml).
 */
export function shopifyRichTextToHtml(raw: string | null | undefined): string | null {
  if (!raw) return null
  let root: ShopifyRichTextNode
  try {
    root = JSON.parse(raw)
  } catch {
    return null
  }
  if (!root.children || root.children.length === 0) return null

  const blocks: string[] = []
  const walk = (node: ShopifyRichTextNode) => {
    if (node.type === 'heading') {
      const level = clampHeadingLevel(node.level)
      const groups = splitInlinesOnBlankLines((node.children ?? []).flatMap((c) => extractInlines(c)))
      groups.forEach((group) => {
        const html = renderInlineGroup(group)
        if (html.trim()) blocks.push(`<h${level}>${html}</h${level}>`)
      })
      return
    }
    if (node.type === 'list' && node.children) {
      const tag = node.listType === 'ordered' ? 'ol' : 'ul'
      const items = node.children
        .map((item) => {
          const html = renderInlineGroup((item.children ?? []).flatMap((c) => extractInlines(c)))
          return html.trim() ? `<li>${html}</li>` : ''
        })
        .filter(Boolean)
        .join('')
      if (items) blocks.push(`<${tag}>${items}</${tag}>`)
      return
    }
    if (node.children) {
      const groups = splitInlinesOnBlankLines(node.children.flatMap((c) => extractInlines(c)))
      groups.forEach((group) => {
        const html = renderInlineGroup(group)
        if (html.trim()) blocks.push(`<p>${html}</p>`)
      })
    }
  }
  root.children.forEach(walk)
  return blocks.length > 0 ? blocks.join('') : null
}

/**
 * Fallback for a variant_description value that isn't parseable rich-text
 * JSON (the field contract originally proposed plain multi-line text, and
 * shopifyRichTextToHtml returns null rather than guessing on non-JSON
 * input). Escapes and blank-line-splits into <p> blocks, single newlines
 * within a block become <br/> — output is safe for dangerouslySetInnerHTML.
 */
export function plainTextToHtml(raw: string): string | null {
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return null
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('')
}
