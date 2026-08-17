// Shopify's "Rich text" metafield type stores a JSON document (root ->
// paragraph/heading/list/list-item -> text/link nodes), not a plain string.
// Confirmed live 2026-08-17: Izzy created custom.variant_description as this
// type rather than the "Multi-line text" type originally proposed
// (docs/launch/2026-08-14-variant-field-contract.md), so its raw .value is
// JSON, not display text. custom.shipping_returns (H-01) is described as
// "rich text" directly in Bilal's launch-direction message and is expected
// to carry the same shape. Deliberately produces plain text, not HTML — the
// field contract's "safely render" requirement is satisfied by never passing
// merchant-entered content through dangerouslySetInnerHTML.

type RichTextNode = {
  type?: string
  value?: string
  children?: RichTextNode[]
}

function isRichTextNode(value: unknown): value is RichTextNode {
  return typeof value === 'object' && value !== null
}

function extractText(node: RichTextNode): string {
  if (typeof node.value === 'string') return node.value
  if (!Array.isArray(node.children)) return ''
  return node.children.map(extractText).join('')
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list-item'])

/** Walks the root's children, one line per block-level node (paragraph,
    heading, list item), blank line between top-level blocks so
    `whitespace-pre-line` renders a visible paragraph break. */
function blocksToLines(nodes: RichTextNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === 'list' && Array.isArray(node.children)) {
      return [node.children.map(extractText).join('\n')]
    }
    if (node.type && BLOCK_TYPES.has(node.type)) return [extractText(node)]
    if (Array.isArray(node.children)) return blocksToLines(node.children)
    return []
  })
}

/**
 * Converts a raw Shopify metafield `.value` to display-ready plain text.
 * - null/undefined -> null (nothing to render).
 * - Shopify rich_text JSON (`{ type: 'root', children: [...] }`) -> plain
 *   text, block nodes joined with a blank line.
 * - Anything else (genuinely plain text, or JSON that isn't the rich_text
 *   shape) -> returned unchanged, so Multi-line text fields are never mangled.
 */
export function richTextToPlainText(raw: string | null | undefined): string | null {
  if (raw == null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return raw
  }

  if (!isRichTextNode(parsed) || parsed.type !== 'root' || !Array.isArray(parsed.children)) {
    return raw
  }

  return blocksToLines(parsed.children).join('\n\n')
}
