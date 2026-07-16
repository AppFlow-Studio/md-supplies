// ONE registry for the category tree — sourced from live category:/subcategory:
// product tags, never from the Shopify collection list (that legacy source
// only reached 51% of the catalog; see docs/superpowers/plans/
// 2026-07-16-category-tree-registry-phase1.md for the audit).

import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_ALL_PRODUCT_TAGS } from '@/lib/shopify/queries/products'

const CATEGORY_TAG_PREFIX = 'category:'
const SUBCATEGORY_TAG_PREFIX = 'subcategory:'

export type ProductTagSummary = {
  handle: string
  categories: string[]
  subcategories: string[]
}

export function parseProductTags(tags: string[]): {
  categories: string[]
  subcategories: string[]
} {
  return {
    categories: tags
      .filter((t) => t.startsWith(CATEGORY_TAG_PREFIX))
      .map((t) => t.slice(CATEGORY_TAG_PREFIX.length)),
    subcategories: tags
      .filter((t) => t.startsWith(SUBCATEGORY_TAG_PREFIX))
      .map((t) => t.slice(SUBCATEGORY_TAG_PREFIX.length)),
  }
}

export type L1CategoryDef = {
  tag: string
  displayName: string
  // Shopify collection handle used for tile artwork (image/description) AND
  // as the Phase 1 navigation target (`/category/<collectionHandle>`). For
  // most L1s this handle matches the category well, but 5 are narrower
  // "representative" sub-collections chosen for their image (e.g.
  // surgery-procedure -> trocars-trocar-kits, room-furniture -> seating,
  // testing -> testing-screening, apparel -> capes-gowns, face-masks ->
  // face-coverings) — clicking those tiles currently lands on a narrower
  // collection than the tile's label promises. Tag-scoped category landing
  // (making the destination match the tag-derived product set exactly) is
  // deferred to Phase 2. Regardless of this field's value, it is never a
  // membership/existence signal for the registry — CATEGORY_TREE_L1
  // membership (which 25 tiles exist) is tag-derived only.
  collectionHandle: string
}

// The 25 approved category: tag values, confirmed against the live catalog
// on 2026-07-16 (7,386 active products). See the plan's Global Constraints
// for the reconciliation against the ticket's stated count of 26.
export const CATEGORY_TREE_L1: readonly L1CategoryDef[] = [
  { tag: 'gloves', displayName: 'Gloves', collectionHandle: 'gloves' },
  { tag: 'wound-care', displayName: 'Wound Care', collectionHandle: 'wound-care' },
  { tag: 'needles-syringes', displayName: 'Needles & Syringes', collectionHandle: 'needles-syringes' },
  { tag: 'surgical-sutures', displayName: 'Surgical Sutures', collectionHandle: 'surgical-sutures' },
  { tag: 'testing', displayName: 'Testing', collectionHandle: 'testing-screening' },
  { tag: 'exam-room', displayName: 'Exam Room', collectionHandle: 'exam-room' },
  { tag: 'respiratory', displayName: 'Respiratory', collectionHandle: 'respiratory' },
  { tag: 'mobility', displayName: 'Mobility', collectionHandle: 'mobility' },
  { tag: 'patient-therapy-rehab', displayName: 'Patient Therapy & Rehab', collectionHandle: 'patient-therapy-rehab' },
  { tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'trocars-trocar-kits' },
  { tag: 'apparel', displayName: 'Apparel', collectionHandle: 'capes-gowns' },
  { tag: 'hygiene', displayName: 'Hygiene', collectionHandle: 'hygiene' },
  { tag: 'disinfectants', displayName: 'Disinfectants', collectionHandle: 'disinfectants' },
  { tag: 'home-care', displayName: 'Home Care', collectionHandle: 'home-care' },
  { tag: 'emergency-supplies', displayName: 'Emergency Supplies', collectionHandle: 'emergency-supplies' },
  { tag: 'incontinence', displayName: 'Incontinence', collectionHandle: 'incontinence' },
  { tag: 'iv-therapy', displayName: 'IV Therapy', collectionHandle: 'iv-therapy' },
  { tag: 'urology-ostomy', displayName: 'Urology & Ostomy', collectionHandle: 'urology-ostomy' },
  { tag: 'sterilization', displayName: 'Sterilization', collectionHandle: 'sterilization' },
  { tag: 'dental', displayName: 'Dental', collectionHandle: 'dental' },
  { tag: 'housekeeping-janitorial', displayName: 'Housekeeping & Janitorial', collectionHandle: 'housekeeping-janitorial' },
  { tag: 'bariatric', displayName: 'Bariatric', collectionHandle: 'bariatric' },
  { tag: 'room-furniture', displayName: 'Room Furniture', collectionHandle: 'seating' },
  { tag: 'face-masks', displayName: 'Face Masks', collectionHandle: 'face-coverings' },
  { tag: 'pharmacy-products', displayName: 'Pharmacy Products', collectionHandle: 'pharmacy-products' },
] as const

// Confirmed live on 2026-07-16 (see plan Global Constraints) — 3 of the 5
// products the spec calls out are dual-tagged today; the 2 Universal
// Mattress Cover products are not (see comment below).
export const PRODUCT_CATEGORY_OVERRIDES: Record<string, string> = {
  'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs': 'mobility',
  'iv-catheter-20g-x-2-box-sr-ox2051ca-3sr-ox2051ca': 'iv-therapy',
  'surgical-aspirator-tips-1-4-green': 'dental',
  // Universal Mattress Cover products (universal-defined-perimeter-mattress-
  // cover-42-1pc-cs, universal-mattress-cover-w-defined-perimeter-36-x-80-x-
  // 6-1pc-cs): canonical category is home-care vs. housekeeping-janitorial,
  // pending catalog-team sign-off. They carry only category:room-furniture
  // live today, so no override is needed until that tag changes.
}

export function resolveCanonicalCategory(summary: ProductTagSummary): string | null {
  return PRODUCT_CATEGORY_OVERRIDES[summary.handle] ?? summary.categories[0] ?? null
}

export type L1Tile = L1CategoryDef & { productCount: number }

export function buildL1Tiles(summaries: ProductTagSummary[]): L1Tile[] {
  const counts = new Map<string, number>()
  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return CATEGORY_TREE_L1.map((l1) => ({ ...l1, productCount: counts.get(l1.tag) ?? 0 }))
}

export type L2Node = {
  tag: string
  parentTag: string
  crossLinkParentTag?: string
  productCount: number
}

// The 3 real boundary splits called out in the spec — deliberate picks, not
// always the raw-count winner (exam-tables favors room-furniture over the
// larger exam-room count on purpose).
export const BOUNDARY_L1_OVERRIDES: Record<string, { canonical: string; crossLink: string }> = {
  'barrier-sleeves': { canonical: 'exam-room', crossLink: 'dental' },
  'vital-sign-monitors': { canonical: 'testing', crossLink: 'exam-room' },
  'exam-tables': { canonical: 'room-furniture', crossLink: 'exam-room' },
}

export function buildL2Tree(summaries: ProductTagSummary[]): L2Node[] {
  const l1Tags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const subProductCounts = new Map<string, number>()
  const subParentCounts = new Map<string, Map<string, number>>()

  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    for (const sub of summary.subcategories) {
      subProductCounts.set(sub, (subProductCounts.get(sub) ?? 0) + 1)
      if (!category || !l1Tags.has(category)) continue
      let parentCounts = subParentCounts.get(sub)
      if (!parentCounts) {
        parentCounts = new Map()
        subParentCounts.set(sub, parentCounts)
      }
      parentCounts.set(category, (parentCounts.get(category) ?? 0) + 1)
    }
  }

  const nodes: L2Node[] = []
  for (const [sub, parentCounts] of subParentCounts.entries()) {
    const override = BOUNDARY_L1_OVERRIDES[sub]
    let parentTag: string
    let crossLinkParentTag: string | undefined
    if (override) {
      parentTag = override.canonical
      crossLinkParentTag = override.crossLink
    } else {
      const [dominant] = [...parentCounts.entries()].sort((a, b) => b[1] - a[1])
      parentTag = dominant[0]
    }
    nodes.push({ tag: sub, parentTag, crossLinkParentTag, productCount: subProductCounts.get(sub) ?? 0 })
  }
  return nodes
}

type ProductTagsResponse = {
  products: {
    nodes: { handle: string; tags: string[] }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

// Full-catalog tag scan (~30 requests at 7,400 products / 250 per page).
// Cached for 1 hour under the 'category-tree' tag — the catalog moves daily
// per the spec, so this is far less aggressive than the 5-minute default in
// storefront.ts, and can be bumped via revalidateTag('category-tree') if a
// faster refresh is ever needed.
export async function fetchProductTagSummaries(): Promise<ProductTagSummary[]> {
  const summaries: ProductTagSummary[] = []
  let cursor: string | null = null

  while (true) {
    const data: ProductTagsResponse = await storefrontFetch<ProductTagsResponse>(
      GET_ALL_PRODUCT_TAGS,
      { first: 250, after: cursor },
      { next: { revalidate: 3600, tags: ['shopify', 'category-tree'] } },
    )

    for (const node of data.products.nodes) {
      const { categories, subcategories } = parseProductTags(node.tags)
      summaries.push({ handle: node.handle, categories, subcategories })
    }

    const nextCursor = data.products.pageInfo.endCursor
    if (!data.products.pageInfo.hasNextPage || !nextCursor || nextCursor === cursor) break
    cursor = nextCursor
  }

  return summaries
}
