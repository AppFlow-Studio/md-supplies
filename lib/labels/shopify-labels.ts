import type { ProductLabel } from './labels'

/**
 * Shopify-native product labels — the headless replacement for Fordeer.
 *
 * WHY THIS EXISTS
 * Read-only probe of this store's Admin API (2026-08-02) found NO Fordeer data
 * reachable from a headless storefront: no `fordeer` metafield namespace, no
 * app-reserved ($app:) definition, and no Fordeer metaobject. Fordeer keeps its
 * rules in its own database and paints them on with a THEME APP EMBED — which
 * is exactly why the app dashboard reports "0 active app blocks" and why a
 * custom storefront renders nothing. Scraping the theme is prohibited.
 *
 * So labels are authored in Shopify itself, where the data is ours, readable
 * through the Storefront API, and versioned with the product.
 *
 * DATA MODEL (created once in Shopify Admin — see docs/fordeer-replacement.md)
 *   metaobject  `product_label`
 *     text          single line text   — the visible label, e.g. "Rx Only"
 *     accessible_text single line text — screen-reader text (optional)
 *     style         single line text   — one of: rx | backorder | promo | neutral
 *     priority      integer            — lower renders first (optional)
 *     starts_at     date/time          — optional schedule window
 *     ends_at       date/time          — optional schedule window
 *   product metafield `custom.product_labels`
 *     type: list.metaobject_reference → product_label
 *
 * Until those definitions exist this module simply returns [] — the storefront
 * keeps rendering the tag/metafield labels it already supports, so shipping
 * this is inert and safe.
 *
 * A label NEVER creates a shipping promise: `style: promo` is decorative only.
 * Free-shipping messaging still comes exclusively from the shipping resolver's
 * public_display_class.
 */

export const PRODUCT_LABELS_METAFIELD = { namespace: 'custom', key: 'product_labels' } as const

/** Raw Storefront shape for one referenced `product_label` metaobject. */
export type RawLabelMetaobject = {
  fields?: { key: string; value: string | null }[] | null
}

export type RawProductLabels = {
  references?: { nodes?: RawLabelMetaobject[] | null } | null
} | null

function field(node: RawLabelMetaobject, key: string): string | null {
  const v = node.fields?.find((f) => f.key === key)?.value
  const trimmed = (v ?? '').trim()
  return trimmed === '' ? null : trimmed
}

function withinSchedule(node: RawLabelMetaobject, now: Date): boolean {
  const start = field(node, 'starts_at')
  const end = field(node, 'ends_at')
  if (start) {
    const t = new Date(start)
    if (!isNaN(t.getTime()) && now < t) return false
  }
  if (end) {
    const t = new Date(end)
    // Expired labels disappear rather than lingering as a stale promise.
    if (!isNaN(t.getTime()) && now > t) return false
  }
  return true
}

const STYLE_TO_TYPE: Record<string, ProductLabel['type']> = {
  rx: 'rx-only',
  backorder: 'backorder',
}

/**
 * Normalizes referenced label metaobjects into the shared ProductLabel
 * contract, so cards/PDP/quick-add/cart render them through the same path as
 * the existing tag- and metafield-derived labels.
 */
export function resolveShopifyLabels(
  raw: RawProductLabels,
  now: Date = new Date(),
): ProductLabel[] {
  const nodes = raw?.references?.nodes ?? []
  return nodes
    .filter((n) => withinSchedule(n, now))
    .flatMap((n) => {
      const text = field(n, 'text')
      if (!text) return []
      const style = (field(n, 'style') ?? 'neutral').toLowerCase()
      const priorityRaw = field(n, 'priority')
      const parsedPriority = priorityRaw ? Number.parseInt(priorityRaw, 10) : NaN
      return [{
        type: STYLE_TO_TYPE[style] ?? 'promo',
        text,
        accessibleText: field(n, 'accessible_text') ?? text,
        priority: Number.isFinite(parsedPriority) ? parsedPriority : 50,
        source: 'metaobject' as const,
      }]
    })
    .sort((a, b) => a.priority - b.priority)
}
