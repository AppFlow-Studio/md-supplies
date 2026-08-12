// ONE registry for the category tree — sourced from live category:/subcategory:
// product tags, never from the Shopify collection list (that legacy source
// only reached 51% of the catalog; see docs/superpowers/plans/
// 2026-07-16-category-tree-registry-phase1.md for the audit).

import { ROUTES } from '@/lib/routes'

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
  // Nav placement (E1) — a straight positional copy from the legacy
  // ROADMAP_CATEGORIES split (lib/category-nav.ts), not a live-data
  // signal. Preserves the existing nav grouping across the registry swap;
  // see docs/superpowers/specs/2026-07-17-nav-wiring-design.md.
  navGroup: 'primary' | 'more'
  // Approved launch copy for the /categories hub card (DEV-LAUNCH-03,
  // Appendix A) — verbatim, client-approved text. Do not rewrite, trim, or
  // auto-generate; if a category needs new copy, that's a client decision.
  // See docs/superpowers/specs/2026-08-07-categories-shortdescription-design.md
  // Appendix A for the source-of-truth copy table.
  shortDescription: string
}

// The 25 approved category: tag values, confirmed against the live catalog
// on 2026-07-16 (7,386 active products). See the plan's Global Constraints
// for the reconciliation against the ticket's stated count of 26.
export const CATEGORY_TREE_L1: readonly L1CategoryDef[] = [
  { tag: 'gloves', displayName: 'Gloves', collectionHandle: 'gloves', navGroup: 'primary', shortDescription: 'Exam and procedure gloves in nitrile, latex, and vinyl options for clinical, laboratory, and facility use.' },
  { tag: 'wound-care', displayName: 'Wound Care', collectionHandle: 'wound-care', navGroup: 'primary', shortDescription: 'Dressings, gauze, bandages, tapes, irrigation supplies, and other essentials for routine wound care.' },
  { tag: 'needles-syringes', displayName: 'Needles & Syringes', collectionHandle: 'needles-syringes', navGroup: 'primary', shortDescription: 'Needles, syringes, and injection accessories in a range of gauges, sizes, and safety configurations.' },
  { tag: 'surgical-sutures', displayName: 'Surgical Sutures', collectionHandle: 'surgical-sutures', navGroup: 'primary', shortDescription: 'Absorbable and non-absorbable sutures, needles, and wound-closure supplies for clinical procedures.' },
  { tag: 'testing', displayName: 'Testing', collectionHandle: 'testing-screening', navGroup: 'primary', shortDescription: 'Diagnostic, screening, specimen-collection, and point-of-care testing supplies for healthcare settings.' },
  { tag: 'exam-room', displayName: 'Exam Room', collectionHandle: 'exam-room', navGroup: 'primary', shortDescription: 'Everyday exam-room equipment and supplies, including tables, stools, lighting, and patient-care essentials.' },
  { tag: 'respiratory', displayName: 'Respiratory', collectionHandle: 'respiratory', navGroup: 'primary', shortDescription: 'Respiratory-care supplies for oxygen delivery, nebulization, airway support, and routine patient treatment.' },
  { tag: 'mobility', displayName: 'Mobility', collectionHandle: 'mobility', navGroup: 'primary', shortDescription: 'Wheelchairs, walkers, canes, rollators, and mobility accessories for patient support and daily movement.' },
  { tag: 'patient-therapy-rehab', displayName: 'Patient Therapy & Rehab', collectionHandle: 'patient-therapy-rehab', navGroup: 'primary', shortDescription: 'Therapy, rehabilitation, exercise, and positioning products that support recovery and patient mobility.' },
  { tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'trocars-trocar-kits', navGroup: 'primary', shortDescription: 'Procedure-room instruments, kits, trays, and accessories for minor surgery and clinical procedures.' },
  { tag: 'apparel', displayName: 'Apparel', collectionHandle: 'capes-gowns', navGroup: 'primary', shortDescription: 'Medical apparel, gowns, caps, footwear, scrubs, and protective clothing for healthcare teams and patients.' },
  { tag: 'hygiene', displayName: 'Hygiene', collectionHandle: 'hygiene', navGroup: 'primary', shortDescription: 'Personal-hygiene and patient-care products for bathing, oral care, grooming, and everyday cleanliness.' },
  { tag: 'disinfectants', displayName: 'Disinfectants', collectionHandle: 'disinfectants', navGroup: 'primary', shortDescription: 'Cleaning and disinfection products for surfaces, equipment, hands, and infection-control routines.' },
  { tag: 'home-care', displayName: 'Home Care', collectionHandle: 'home-care', navGroup: 'more', shortDescription: 'Practical medical and personal-care supplies designed for patients, caregivers, and home-health use.' },
  { tag: 'emergency-supplies', displayName: 'Emergency Supplies', collectionHandle: 'emergency-supplies', navGroup: 'more', shortDescription: 'First-aid, trauma, rescue, and emergency-response supplies for clinics, facilities, and mobile teams.' },
  { tag: 'incontinence', displayName: 'Incontinence', collectionHandle: 'incontinence', navGroup: 'more', shortDescription: 'Briefs, underpads, liners, wipes, and related products for dependable incontinence and skin care.' },
  { tag: 'iv-therapy', displayName: 'IV Therapy', collectionHandle: 'iv-therapy', navGroup: 'more', shortDescription: 'IV administration, infusion, access, and securement supplies for clinical fluid and medication delivery.' },
  { tag: 'urology-ostomy', displayName: 'Urology & Ostomy', collectionHandle: 'urology-ostomy', navGroup: 'more', shortDescription: 'Catheters, drainage, ostomy, and related accessories for urological and ostomy care.' },
  { tag: 'sterilization', displayName: 'Sterilization', collectionHandle: 'sterilization', navGroup: 'more', shortDescription: 'Sterilization pouches, wraps, indicators, cleaners, and accessories for instrument-processing workflows.' },
  { tag: 'dental', displayName: 'Dental', collectionHandle: 'dental', navGroup: 'more', shortDescription: 'Dental procedure, examination, infection-control, and patient-care supplies for dental practices.' },
  { tag: 'housekeeping-janitorial', displayName: 'Housekeeping & Janitorial', collectionHandle: 'housekeeping-janitorial', navGroup: 'more', shortDescription: 'Facility-cleaning, waste-handling, paper, and janitorial supplies for healthcare environments.' },
  { tag: 'bariatric', displayName: 'Bariatric', collectionHandle: 'bariatric', navGroup: 'more', shortDescription: 'Bariatric patient-care and mobility equipment designed for higher weight capacities and added support.' },
  { tag: 'room-furniture', displayName: 'Room Furniture', collectionHandle: 'seating', navGroup: 'more', shortDescription: 'Seating, exam tables, cabinets, and room furnishings for treatment, consultation, and patient-care spaces.' },
  { tag: 'face-masks', displayName: 'Face Masks', collectionHandle: 'face-coverings', navGroup: 'more', shortDescription: 'Procedure masks, respirators, and face coverings for clinical, facility, and everyday protective use.' },
  { tag: 'pharmacy-products', displayName: 'Pharmacy Products', collectionHandle: 'pharmacy-products', navGroup: 'more', shortDescription: 'Dispensing, labeling, packaging, counting, and patient-use supplies for pharmacy operations.' },
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

// Attribute-patterned subcategory: values — a numeric size/gauge/volume
// modifier on a base concept (e.g. "25G Hypodermic Needles"). Per the ticket,
// these render as facets on their parent L1 page, never their own tile/route.
// Confirmed against a live tag pull (2026-07-16, 794 distinct subcategory:
// values) — see docs/superpowers/specs/2026-07-17-attribute-subcategory-
// exclusion-sitemap-design.md, and re-checked on every audit-category-tree.ts
// run (Task 2 below) since that pull only sampled the top ~250 by frequency.
// Deliberately narrow: false negatives (an attribute tag that still gets a
// route) are acceptable and correctable later; false positives (a real
// subcategory silently losing its page) are not, so ambiguous tags (e.g.
// "12-panel") are left unmatched.
export const ATTRIBUTE_SUBCATEGORY_PATTERNS: readonly RegExp[] = [
  /^\d+g-/,                      // gauge prefix: 25g-hypodermic-needles, 21g-lancets, 20g-iv-catheters
  /^\d+-0-sutures$/,             // suture gauge: 4-0-sutures, 3-0-sutures
  /^0-sutures$/,                 // suture gauge: 0-sutures
  /^\d+cc-/,                     // syringe volume: 3cc-syringe, 10cc-syringe
  /^manual-wheelchairs-\d+$/,    // wheelchair width: manual-wheelchairs-20
  /^\d+-gal-/,                   // sharps volume: 2-gal-sharps
]

export function isAttributeSubcategoryTag(tag: string): boolean {
  return ATTRIBUTE_SUBCATEGORY_PATTERNS.some((p) => p.test(tag))
}

export function buildL2Tree(summaries: ProductTagSummary[]): L2Node[] {
  const l1Tags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const subProductCounts = new Map<string, number>()
  const subParentCounts = new Map<string, Map<string, number>>()

  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    for (const sub of summary.subcategories) {
      if (isAttributeSubcategoryTag(sub)) continue
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

export function getL1ByCollectionHandle(handle: string): L1CategoryDef | undefined {
  return CATEGORY_TREE_L1.find((c) => c.collectionHandle === handle)
}

export function humanizeTag(tag: string): string {
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function buildSubcategoryTagQuery(categoryTag: string, subTag: string): string {
  return `tag:"category:${categoryTag}" AND tag:"subcategory:${subTag}"`
}

export function getSubcategoriesForParent(parentTag: string, l2Nodes: L2Node[]): L2Node[] {
  return l2Nodes.filter((n) => n.parentTag === parentTag)
}

export type CategoryNavEntry = { displayName: string; href: string }

export function buildCategoryTreeNav(
  collections: { handle: string }[],
): { primary: CategoryNavEntry[]; more: CategoryNavEntry[] } {
  const liveHandles = new Set(collections.map((c) => c.handle))
  const primary: CategoryNavEntry[] = []
  const more: CategoryNavEntry[] = []

  for (const l1 of CATEGORY_TREE_L1) {
    if (!liveHandles.has(l1.collectionHandle)) continue
    const entry: CategoryNavEntry = { displayName: l1.displayName, href: ROUTES.category(l1.collectionHandle) }
    if (l1.navGroup === 'primary') primary.push(entry)
    else more.push(entry)
  }

  return { primary, more }
}

export function getProductCategoryPath(
  summary: ProductTagSummary,
  l2Nodes: L2Node[],
): { category: L1CategoryDef; subcategory: L2Node | null } | null {
  const subcategory = l2Nodes.find((n) => summary.subcategories.includes(n.tag)) ?? null
  const categoryTag = subcategory ? subcategory.parentTag : resolveCanonicalCategory(summary)
  if (!categoryTag) return null

  const category = CATEGORY_TREE_L1.find((c) => c.tag === categoryTag)
  if (!category) return null

  return { category, subcategory }
}
