import { ROUTES } from '@/lib/routes'

export type RoadmapCategory = {
  displayName: string
  navGroup: 'primary' | 'more'
  matchedHandles: string[]
}

// §3.1 approved category structure, checked against the live Shopify
// catalog on 2026-06-18 via scripts/audit-collections.ts. Categories with
// an empty matchedHandles array have no live Shopify collection yet and
// are reported by getUnmappedRoadmapCategories() / the audit script
// instead of being rendered.
export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'] },
  { displayName: 'Wound Care', navGroup: 'primary', matchedHandles: ['wound-care'] },
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Surgical Sutures', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Testing', navGroup: 'primary', matchedHandles: ['testing-screening'] },
  { displayName: 'Exam Room', navGroup: 'primary', matchedHandles: ['exam-room'] },
  { displayName: 'Respiratory', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Mobility', navGroup: 'primary', matchedHandles: ['mobility'] },
  { displayName: 'Patient Therapy & Rehab', navGroup: 'primary', matchedHandles: ['patient-therapy-rehab'] },
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
  },
  { displayName: 'Hygiene', navGroup: 'primary', matchedHandles: ['hygiene'] },
  { displayName: 'Disinfectants', navGroup: 'primary', matchedHandles: [] },
  { displayName: 'Home Care', navGroup: 'more', matchedHandles: ['home-care'] },
  { displayName: 'Emergency Supplies', navGroup: 'more', matchedHandles: ['emergency-supplies'] },
  { displayName: 'Incontinence', navGroup: 'more', matchedHandles: ['incontinence'] },
  { displayName: 'IV Therapy', navGroup: 'more', matchedHandles: [] },
  { displayName: 'Urology & Ostomy', navGroup: 'more', matchedHandles: [] },
  { displayName: 'Sterilization', navGroup: 'more', matchedHandles: [] },
  { displayName: 'Dental', navGroup: 'more', matchedHandles: ['dental'] },
  { displayName: 'Housekeeping & Janitorial', navGroup: 'more', matchedHandles: ['housekeeping-janitorial'] },
  { displayName: 'Bariatric', navGroup: 'more', matchedHandles: ['bariatric'] },
  { displayName: 'Room Furniture', navGroup: 'more', matchedHandles: ['seating', 'exam-tables'] },
  { displayName: 'Face Masks', navGroup: 'more', matchedHandles: ['face-coverings'] },
  { displayName: 'Pharmacy Products', navGroup: 'more', matchedHandles: [] },
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
