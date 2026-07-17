// Policy layer from the finalized Category Architecture spec + launch-gate
// ticket. Identity is tag/handle only — never title (duplicate titles and
// &/and drift exist in the catalog).
import type { L1Config, BoundaryOverride } from './types'

export const L1_CATEGORIES: L1Config[] = [
  { tag: 'gloves',                  handle: 'gloves',                  displayName: 'Gloves',                  navGroup: 'primary', placeholderSlug: 'gloves' },
  { tag: 'wound-care',              handle: 'wound-care',              displayName: 'Wound Care',              navGroup: 'primary', placeholderSlug: 'wound-care' },
  { tag: 'needles-syringes',        handle: 'needles-syringes',        displayName: 'Needles & Syringes',      navGroup: 'primary', placeholderSlug: 'needles-syringes' },
  { tag: 'surgical-sutures',        handle: 'surgical-sutures',        displayName: 'Surgical Sutures',        navGroup: 'primary', placeholderSlug: 'surgical-sutures' },
  { tag: 'testing',                 handle: 'testing-screening',       displayName: 'Testing',                 navGroup: 'primary', placeholderSlug: 'testing' },
  { tag: 'exam-room',               handle: 'exam-room',               displayName: 'Exam Room',               navGroup: 'primary', placeholderSlug: 'exam-room' },
  { tag: 'respiratory',             handle: 'respiratory',             displayName: 'Respiratory',             navGroup: 'primary', placeholderSlug: 'respiratory' },
  { tag: 'mobility',                handle: 'mobility',                displayName: 'Mobility',                navGroup: 'primary', placeholderSlug: 'mobility' },
  { tag: 'patient-therapy-rehab',   handle: 'patient-therapy-rehab',   displayName: 'Patient Therapy & Rehab', navGroup: 'primary', placeholderSlug: 'patient-therapy-rehab' },
  { tag: 'surgery-procedure',       handle: 'surgery-procedure',       displayName: 'Surgery & Procedure',     navGroup: 'primary', placeholderSlug: 'surgery-procedure' },
  { tag: 'apparel',                 handle: 'apparel',                 displayName: 'Apparel',                 navGroup: 'primary', placeholderSlug: 'apparel' },
  { tag: 'hygiene',                 handle: 'hygiene',                 displayName: 'Hygiene',                 navGroup: 'primary', placeholderSlug: 'hygiene' },
  { tag: 'disinfectants',           handle: 'disinfectants',           displayName: 'Disinfectants',           navGroup: 'primary', placeholderSlug: 'disinfectants' },
  { tag: 'home-care',               handle: 'home-care',               displayName: 'Home Care',               navGroup: 'more',    placeholderSlug: 'home-care' },
  { tag: 'emergency-supplies',      handle: 'emergency-supplies',      displayName: 'Emergency Supplies',      navGroup: 'more',    placeholderSlug: 'emergency-supplies' },
  { tag: 'incontinence',            handle: 'incontinence',            displayName: 'Incontinence',            navGroup: 'more',    placeholderSlug: 'incontinence' },
  { tag: 'iv-therapy',              handle: 'iv-therapy',              displayName: 'IV Therapy',              navGroup: 'more',    placeholderSlug: 'iv-therapy' },
  { tag: 'urology-ostomy',          handle: 'urology-ostomy',          displayName: 'Urology & Ostomy',        navGroup: 'more',    placeholderSlug: 'urology-ostomy' },
  { tag: 'sterilization',           handle: 'sterilization',           displayName: 'Sterilization',           navGroup: 'more',    placeholderSlug: 'sterilization' },
  { tag: 'dental',                  handle: 'dental',                  displayName: 'Dental',                  navGroup: 'more',    placeholderSlug: 'dental' },
  { tag: 'housekeeping-janitorial', handle: 'housekeeping-janitorial', displayName: 'Housekeeping & Janitorial', navGroup: 'more',  placeholderSlug: 'housekeeping-janitorial' },
  { tag: 'bariatric',               handle: 'bariatric',               displayName: 'Bariatric',               navGroup: 'more',    placeholderSlug: 'bariatric' },
  { tag: 'room-furniture',          handle: 'room-furniture',          displayName: 'Room Furniture',          navGroup: 'more',    placeholderSlug: 'room-furniture' },
  { tag: 'face-masks',              handle: 'face-masks',              displayName: 'Face Masks',              navGroup: 'more',    placeholderSlug: 'face-masks' },
  { tag: 'pharmacy-products',       handle: 'pharmacy-products',       displayName: 'Pharmacy Products',       navGroup: 'more',    placeholderSlug: 'pharmacy-products' },
]
// Reconciled against the 2026-07-17 live pull (docs/category-tree-report.md):
// the tag backbone carries 25 category: values, not the ticket's 26 —
// blood-collection turned out to be subcategories under needles-syringes,
// and no other candidate exists live (strays non-medical/non-healthcare/
// office-supplies/daily-living-aids ≈ the OCC set, excluded by ticket).
// If Izzy confirms a 26th L1, add one row here and re-run
// scripts/build-category-tree.ts.

export const BOUNDARY_OVERRIDES: BoundaryOverride[] = [
  { subcategoryTag: 'barrier-sleeves',     parentTag: 'exam-room',      crossLinkTag: 'dental' },
  { subcategoryTag: 'vital-sign-monitors', parentTag: 'testing',        crossLinkTag: 'exam-room' },
  { subcategoryTag: 'exam-tables',         parentTag: 'room-furniture', crossLinkTag: 'exam-room' },
]

// Canonical category: per dual-tagged product (5 known). Keys are product
// handles — reconciled against scripts/build-category-tree.ts report output.
// The two Universal Mattress Covers are BLOCKED (home-care vs
// housekeeping-janitorial pending) — deliberately absent: canonicalCategoryTag
// falls back to the deterministic alphabetical pick and the report flags them.
export const DUAL_CATEGORY_OVERRIDES: Record<string, string> = {
  // Handles reconciled against the live multi-category report 2026-07-17.
  'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs': 'mobility',
  'iv-catheter-20g-x-2-box-sr-ox2051ca-3sr-ox2051ca': 'iv-therapy',
  'surgical-aspirator-tips-1-4-green': 'dental',
  // The two Universal Mattress Covers (BLOCKED home-care vs
  // housekeeping-janitorial) no longer appear dual-tagged in the live pull —
  // nothing to pin; the report's multi-category section is the watchpoint.
}

// Never in the L1 tree: OCC routes to /solutions/occ; Pharmaceuticals under
// review; out-of-tree products have no category: tag at all. The last four
// are the live stray tags carrying the OCC/non-medical set (~100 products,
// 2026-07-17 pull) — excluded per the ticket's OCC/out-of-tree rule.
export const EXCLUDED_CATEGORY_TAGS = new Set([
  'occ',
  'pharmaceuticals',
  'non-medical',
  'non-healthcare',
  'office-supplies',
  'daily-living-aids',
])

// Not-yet-approved collections — no routes/tiles until approved.
export const UNAPPROVED_ROUTE_HANDLES = new Set([
  'urology', 'pharmacy-labels', 'mobility-accessories', 'physician-stools',
  'absorbable-sutures', 'non-absorbable-sutures',
])

// The 4 standalone trocar collections (being unpublished Shopify-side);
// their tags drive facets on the merged Trocars page, never tiles/routes.
export const HIDDEN_TROCAR_HANDLES = new Set([
  'disposable-3-2mm-3-5mm-trocars',
  'disposable-4-5mm-trocars',
  'reusable-3-2mm-3-5mm-trocars',
  'reusable-4-5mm-trocars',
])

// Manual corrections to the pattern classifier, filled during Task 3
// reconciliation against the live ~80 attribute-patterned values.
export const FORCE_CLASSIFICATION: { attribute: string[]; category: string[] } = {
  attribute: [],
  category: [],
}
