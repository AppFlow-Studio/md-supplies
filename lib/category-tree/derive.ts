// Pure derivation over product tags — no I/O, no Shopify types. The build
// script feeds it live data; tests feed it fixtures.
import type { ProductTagRecord, CategoryTreeData, BoundaryOverride } from './types'

export function extractTagValues(tags: string[], prefix: 'category' | 'subcategory'): string[] {
  const p = `${prefix}:`
  const out: string[] = []
  for (const raw of tags) {
    const t = raw.trim().toLowerCase()
    if (t.startsWith(p)) {
      const value = t.slice(p.length).trim()
      if (value) out.push(value)
    }
  }
  return out
}

export function canonicalCategoryTag(
  product: ProductTagRecord,
  overrides: Record<string, string>,
): string | null {
  const values = extractTagValues(product.tags, 'category')
  if (values.length === 0) return null
  if (values.length === 1) return values[0]
  const override = overrides[product.handle]
  if (override && values.includes(override)) return override
  return [...values].sort()[0]
}

export function deriveTreeData(
  products: ProductTagRecord[],
  dualOverrides: Record<string, string>,
): CategoryTreeData {
  const l1Counts = new Map<string, number>()
  const l2Parents = new Map<string, Map<string, number>>()
  const multi: CategoryTreeData['multiCategoryProducts'] = []
  let outOfTree = 0

  for (const product of products) {
    const categories = extractTagValues(product.tags, 'category')
    if (categories.length > 1) {
      multi.push({ handle: product.handle, categoryTags: [...categories].sort() })
    }
    const canonical = canonicalCategoryTag(product, dualOverrides)
    if (!canonical) {
      outOfTree++
      continue
    }
    l1Counts.set(canonical, (l1Counts.get(canonical) ?? 0) + 1)
    for (const sub of extractTagValues(product.tags, 'subcategory')) {
      let parents = l2Parents.get(sub)
      if (!parents) l2Parents.set(sub, (parents = new Map()))
      parents.set(canonical, (parents.get(canonical) ?? 0) + 1)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    outOfTreeCount: outOfTree,
    l1: [...l1Counts].map(([tag, productCount]) => ({ tag, productCount })).sort((a, b) => a.tag.localeCompare(b.tag)),
    l2: [...l2Parents]
      .map(([tag, parents]) => ({ tag, parents: Object.fromEntries([...parents].sort()) }))
      .sort((a, b) => a.tag.localeCompare(b.tag)),
    multiCategoryProducts: multi.sort((a, b) => a.handle.localeCompare(b.handle)),
  }
}

export function resolveParent(
  l2Tag: string,
  parents: Record<string, number>,
  boundary: BoundaryOverride[],
): { parentTag: string; crossLinkTag?: string } | null {
  const override = boundary.find((b) => b.subcategoryTag === l2Tag)
  if (override) return { parentTag: override.parentTag, crossLinkTag: override.crossLinkTag }
  const entries = Object.entries(parents)
  if (entries.length === 0) return null
  entries.sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
  return { parentTag: entries[0][0] }
}

// Attribute-patterned subcategory values (~80) render as facets, never
// tiles/routes. Compound-tag values like "25g-hypodermic-needles" are
// drivable as-is; the clean single-"Gauge" abstraction is flagged, not built.
const ATTRIBUTE_PATTERNS: RegExp[] = [
  /(^|-)\d+(-\d+)?-?(g|ga|gauge|ml|cc|mm|cm|in|inch|fr|oz|qt|quart|gal|gallon|panel)(-|$)/,
  /^size-/,
  /^\d+(-\d+)?-(x|by)-\d+/,
  /(^|-)(x+s|small|medium|large|x+l)$/,
  /^\d+(-0)?-sutures$/,
  /^astm-level-\d+/,
  /^manual-wheelchairs-\d+$/,
]

export function classifySubcategoryTag(
  tag: string,
  force: { attribute: string[]; category: string[] },
): 'category' | 'attribute' {
  if (force.category.includes(tag)) return 'category'
  if (force.attribute.includes(tag)) return 'attribute'
  return ATTRIBUTE_PATTERNS.some((p) => p.test(tag)) ? 'attribute' : 'category'
}
