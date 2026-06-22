import { ROUTES } from '@/lib/routes'

export type RoadmapCategory = {
  displayName: string
  navGroup: 'primary' | 'more'
  matchedHandles: string[]
  placeholderSlug: string
}

// §3.1 approved category structure, checked against the live Shopify
// catalog on 2026-06-18 via scripts/audit-collections.ts. Categories with
// an empty matchedHandles array have no live Shopify collection yet and
// are reported by getUnmappedRoadmapCategories() / the audit script
// instead of being rendered. `placeholderSlug` maps to the §3.5 BunnyCDN
// placeholder filename: `${placeholderSlug}-placeholder.webp`.
export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'], placeholderSlug: 'gloves' },
  { displayName: 'Wound Care', navGroup: 'primary', matchedHandles: ['wound-care'], placeholderSlug: 'wound-care' },
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'needles-syringes' },
  { displayName: 'Surgical Sutures', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'surgical-sutures' },
  { displayName: 'Testing', navGroup: 'primary', matchedHandles: ['testing-screening'], placeholderSlug: 'testing' },
  { displayName: 'Exam Room', navGroup: 'primary', matchedHandles: ['exam-room'], placeholderSlug: 'exam-room' },
  { displayName: 'Respiratory', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'respiratory' },
  { displayName: 'Mobility', navGroup: 'primary', matchedHandles: ['mobility'], placeholderSlug: 'mobility' },
  { displayName: 'Patient Therapy & Rehab', navGroup: 'primary', matchedHandles: ['patient-therapy-rehab'], placeholderSlug: 'patient-therapy-rehab' },
  {
    displayName: 'Surgery & Procedure',
    navGroup: 'primary',
    matchedHandles: [
      'trocars-trocar-kits',
      'disposable-3-2mm-3-5mm-trocars',
      'disposable-4-5mm-trocars',
      'reusable-3-2mm-3-5mm-trocars',
      'reusable-4-5mm-trocars',
    ],
    placeholderSlug: 'surgery-procedure',
  },
  {
    displayName: 'Apparel',
    navGroup: 'primary',
    matchedHandles: [
      'capes-gowns',
      'caps-headwear',
      'coats-jackets',
      'footwear',
      'medical-scrubs',
      'pants-shirts',
      'undergarments-wraps',
    ],
    placeholderSlug: 'apparel',
  },
  { displayName: 'Hygiene', navGroup: 'primary', matchedHandles: ['hygiene'], placeholderSlug: 'hygiene' },
  { displayName: 'Disinfectants', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'disinfectants' },
  { displayName: 'Home Care', navGroup: 'more', matchedHandles: ['home-care'], placeholderSlug: 'home-care' },
  { displayName: 'Emergency Supplies', navGroup: 'more', matchedHandles: ['emergency-supplies'], placeholderSlug: 'emergency-supplies' },
  { displayName: 'Incontinence', navGroup: 'more', matchedHandles: ['incontinence'], placeholderSlug: 'incontinence' },
  { displayName: 'IV Therapy', navGroup: 'more', matchedHandles: [], placeholderSlug: 'iv-therapy' },
  { displayName: 'Urology & Ostomy', navGroup: 'more', matchedHandles: [], placeholderSlug: 'urology-ostomy' },
  { displayName: 'Sterilization', navGroup: 'more', matchedHandles: [], placeholderSlug: 'sterilization' },
  { displayName: 'Dental', navGroup: 'more', matchedHandles: ['dental'], placeholderSlug: 'dental' },
  { displayName: 'Housekeeping & Janitorial', navGroup: 'more', matchedHandles: ['housekeeping-janitorial'], placeholderSlug: 'housekeeping-janitorial' },
  { displayName: 'Bariatric', navGroup: 'more', matchedHandles: ['bariatric'], placeholderSlug: 'bariatric' },
  { displayName: 'Room Furniture', navGroup: 'more', matchedHandles: ['seating', 'exam-tables'], placeholderSlug: 'room-furniture' },
  { displayName: 'Face Masks', navGroup: 'more', matchedHandles: ['face-coverings'], placeholderSlug: 'face-masks' },
  { displayName: 'Pharmacy Products', navGroup: 'more', matchedHandles: [], placeholderSlug: 'pharmacy-products' },
]

export type NavEntry = { displayName: string; href: string }

export function buildCategoryNav(
  collections: { handle: string }[],
): { primary: NavEntry[]; more: NavEntry[] } {
  const liveHandles = new Set(collections.map((c) => c.handle))
  const primary: NavEntry[] = []
  const more: NavEntry[] = []

  for (const category of ROADMAP_CATEGORIES) {
    const matchedHandle = category.matchedHandles.find((h) => liveHandles.has(h))
    if (!matchedHandle) continue

    const entry: NavEntry = { displayName: category.displayName, href: ROUTES.category(matchedHandle) }
    if (category.navGroup === 'primary') primary.push(entry)
    else more.push(entry)
  }

  return { primary, more }
}

export function getUnmappedRoadmapCategories(
  collections: { handle: string }[],
): RoadmapCategory[] {
  const liveHandles = new Set(collections.map((c) => c.handle))
  return ROADMAP_CATEGORIES.filter(
    (category) => !category.matchedHandles.some((h) => liveHandles.has(h)),
  )
}
