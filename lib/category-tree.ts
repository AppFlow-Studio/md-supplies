// ONE registry for the category tree — sourced from live category:/subcategory:
// product tags, never from the Shopify collection list (that legacy source
// only reached 51% of the catalog; see docs/superpowers/plans/
// 2026-07-16-category-tree-registry-phase1.md for the audit).

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
  // Shopify collection handle used only for tile artwork (image/description).
  // Never used as a membership signal — see Global Constraints.
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
