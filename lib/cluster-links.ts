// lib/cluster-links.ts

export interface ClusterLinks {
  industryLinks: { slug: string; name: string }[]
  partnerLinks:  { slug: string; name: string }[]
  occEligible:   boolean
  /**
   * Cross-sell links to OTHER category/subcategory pages (as opposed to
   * industries/partners above). Optional because most categories don't need
   * one — only add an entry here for an evidence-backed pair from an actual
   * SEO brief (see SEO-CATEGORY-01 §6/§8: `categorySeo.ts`'s own
   * `internalLinks` field is documented intent with no renderer anywhere in
   * the codebase; this field is the real, rendered mechanism).
   */
  categoryLinks?: { slug: string; name: string }[]
}

/**
 * Maps Shopify collection handles to topical cluster data.
 * Keys are exact Shopify collection handles. Partial matches
 * (sub-handles) are resolved in the category page via prefix check.
 */
export const CLUSTER_LINKS: Record<string, ClusterLinks> = {
  'wound-care': {
    industryLinks: [
      { slug: 'home-health',    name: 'Home Health' },
      { slug: 'long-term-care', name: 'Long-Term Care' },
      { slug: 'ems',            name: 'EMS & First Responders' },
    ],
    partnerLinks: [
      { slug: 'ad-surgical', name: 'AD Surgical' },
      { slug: 'dukal',       name: 'Dukal' },
      { slug: 'dynarex',     name: 'Dynarex' },
    ],
    occEligible: true,
  },

  // SEO-CATEGORY-01 §8 Sardor brief: Needles & Syringes' own croNotes already
  // flagged HRT/pellet buyers as high-LTV and recommended surfacing Trocar
  // supplies here, but nothing ever wired the link — see
  // docs/audits/2026-09-07-seo-category-01/SEO-CATEGORY-01-TROCARS-TIER1.md §6.
  'needles-syringes': {
    industryLinks: [
      { slug: 'hrt-clinics',    name: 'HRT Clinics' },
      { slug: 'urgent-care',    name: 'Urgent Care' },
      { slug: 'veterinary',     name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
    ],
    categoryLinks: [
      { slug: 'trocars-trocar-kits', name: 'Trocars & Trocar Kits' },
    ],
    occEligible: false,
  },

  'surgical-sutures': {
    industryLinks: [
      { slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" },
      { slug: 'urgent-care',             name: 'Urgent Care' },
    ],
    partnerLinks: [
      { slug: 'ad-surgical', name: 'AD Surgical' },
    ],
    occEligible: false,
  },

  'exam-gloves': {
    industryLinks: [
      { slug: 'dental',       name: 'Dental' },
      { slug: 'urgent-care',  name: 'Urgent Care' },
      { slug: 'veterinary',   name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
      { slug: 'dukal',   name: 'Dukal' },
    ],
    occEligible: true,
  },

  'gloves': {
    industryLinks: [
      { slug: 'dental',      name: 'Dental' },
      { slug: 'urgent-care', name: 'Urgent Care' },
      { slug: 'veterinary',  name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
      { slug: 'dukal',   name: 'Dukal' },
    ],
    occEligible: false,
  },

  'mobility': {
    industryLinks: [
      { slug: 'home-health',      name: 'Home Health' },
      { slug: 'long-term-care',   name: 'Long-Term Care' },
      { slug: 'physical-therapy', name: 'Physical Therapy' },
    ],
    partnerLinks: [],
    occEligible: false,
  },

  'pharmacy': {
    industryLinks: [
      { slug: 'community-health', name: 'Community Health' },
    ],
    partnerLinks: [],
    occEligible: false,
  },

  // 2026-09-05 Izzy brief (SEO-CATEGORY-01): internalLinks list is
  // needles-syringes, surgery-procedure, procedure-tray, hrt-clinics — no
  // partner link. Replaces the dev-authored version below, which added a
  // Kadara Medical brand badge that wasn't in an approved brief (the process
  // gap this same commit corrects). surgery-procedure is already reachable
  // via the breadcrumb/parent link, so it's not repeated here as a
  // cross-sell chip; needles-syringes and procedure-tray are.
  'trocars-trocar-kits': {
    industryLinks: [
      { slug: 'hrt-clinics', name: 'HRT Clinics' },
    ],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'needles-syringes', name: 'Needles & Syringes' },
      { slug: 'procedure-tray', name: 'Procedure Trays' },
    ],
    occEligible: false,
  },

  // The 17 entries below wire the "Internal links" table from each of Izzy's
  // 2026-09-05 category briefs. None of these 17 routes is a CATEGORY_TREE_L1
  // or FEATURED_SUBCATEGORIES member (they're flat, pre-registry Shopify
  // collections), so CategoryPageView's breadcrumb renders single-level for
  // all of them — unlike Trocars, there is no parent link anywhere else on
  // the page, so every destination in each brief's table is wired here,
  // including the "parent category" ones.

  'walking-boots': {
    industryLinks: [
      { slug: 'home-health', name: 'Home Health' },
      { slug: 'urgent-care', name: 'Urgent Care' },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'patient-therapy-rehab', name: 'Patient Therapy & Rehab' }],
    occEligible: false,
  },

  'fiberglass-tape': {
    industryLinks: [{ slug: 'urgent-care', name: 'Urgent Care' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'casting-products', name: 'Casting Products' },
      { slug: 'patient-therapy-rehab', name: 'Patient Therapy & Rehab' },
    ],
    occEligible: false,
  },

  'toilet-safety-rails': {
    industryLinks: [{ slug: 'home-health', name: 'Home Health' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'bathroom', name: 'Bathroom Safety' },
      { slug: 'home-care', name: 'Home Care' },
    ],
    occEligible: false,
  },

  'swabsticks': {
    industryLinks: [{ slug: 'urgent-care', name: 'Urgent Care' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'skin-preparation', name: 'Skin Preparation' },
      { slug: 'povidone-iodine-swabsticks', name: 'Povidone Iodine Swabsticks' },
    ],
    occEligible: false,
  },

  'patient-belongings-bags': {
    industryLinks: [{ slug: 'home-health', name: 'Home Health' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'housekeeping-janitorial', name: 'Housekeeping & Janitorial' },
      { slug: 'reclosable-bags', name: 'Reclosable Bags' },
    ],
    occEligible: false,
  },

  'patient-bibs': {
    industryLinks: [{ slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'dental', name: 'Dental Supplies' },
      { slug: 'patient-therapy-rehab', name: 'Patient Therapy & Rehab' },
    ],
    occEligible: false,
  },

  'wheelchair-parts': {
    industryLinks: [{ slug: 'home-health', name: 'Home Health' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'mobility', name: 'Mobility Supplies' },
      { slug: 'wheelchair-cushions', name: 'Wheelchair Cushions' },
    ],
    occEligible: false,
  },

  'first-aid-kits': {
    industryLinks: [
      { slug: 'urgent-care', name: 'Urgent Care' },
      { slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'emergency-supplies', name: 'Emergency Supplies' }],
    occEligible: false,
  },

  'insulin-pen-needles': {
    industryLinks: [
      { slug: 'home-health', name: 'Home Health' },
      { slug: 'pharmacies', name: 'Pharmacies' },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'needles-syringes', name: 'Needles & Syringes' }],
    occEligible: false,
  },

  'blood-collection-tubes': {
    industryLinks: [{ slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'testing-screening', name: 'Testing & Screening' },
      { slug: 'blood-collection-sets', name: 'Blood Collection Sets' },
    ],
    occEligible: false,
  },

  'surgical-gloves': {
    industryLinks: [
      { slug: 'urgent-care', name: 'Urgent Care' },
      { slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'gloves', name: 'Medical Gloves' }],
    occEligible: false,
  },

  'wound-closure': {
    industryLinks: [{ slug: 'urgent-care', name: 'Urgent Care' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'wound-care', name: 'Wound Care Supplies' },
      { slug: 'surgical-sutures', name: 'Surgical Sutures' },
    ],
    occEligible: false,
  },

  'crutches-1': {
    industryLinks: [
      { slug: 'urgent-care', name: 'Urgent Care' },
      { slug: 'home-health', name: 'Home Health' },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'mobility', name: 'Mobility Supplies' }],
    occEligible: false,
  },

  'alcohol-prep-pads': {
    industryLinks: [
      { slug: 'urgent-care', name: 'Urgent Care' },
      { slug: 'home-health', name: 'Home Health' },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'skin-preparation', name: 'Skin Preparation' }],
    occEligible: false,
  },

  'wheelchairs': {
    industryLinks: [
      { slug: 'home-health', name: 'Home Health' },
      { slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'mobility', name: 'Mobility Supplies' }],
    occEligible: false,
  },

  'wheelchair-cushions': {
    industryLinks: [
      { slug: 'home-health', name: 'Home Health' },
      { slug: 'clinics-doctors-offices', name: "Clinics & Doctor's Offices" },
    ],
    partnerLinks: [],
    categoryLinks: [{ slug: 'mobility', name: 'Mobility Supplies' }],
    occEligible: false,
  },

  'syringe-with-needle': {
    industryLinks: [{ slug: 'urgent-care', name: 'Urgent Care' }],
    partnerLinks: [],
    categoryLinks: [
      { slug: 'needles-syringes', name: 'Needles & Syringes' },
      { slug: 'insulin-pen-needles', name: 'Insulin Pen Needles' },
    ],
    occEligible: false,
  },

  // Reciprocal link for the OCC Sardor brief (docs/audits/2026-09-06-occ-seo-strategy/OCC-SEO-STRATEGY.md
  // §9): /solutions/occ already links out to Hygiene-adjacent subcategories,
  // but nothing linked back from the general Hygiene category to the curated
  // shoebox/charity-drive assortment. occEligible surfaces the existing "Shop
  // by Need" OCC badge here, closing the gap without a new content type.
  'hygiene': {
    industryLinks: [],
    partnerLinks: [],
    occEligible: true,
  },
}

/**
 * Look up cluster links for a given collection handle.
 * Falls back to the parent prefix match (e.g., "gloves-nitrile" → "gloves").
 */
export function getClusterLinks(handle: string): ClusterLinks | null {
  if (CLUSTER_LINKS[handle]) return CLUSTER_LINKS[handle]
  const parts = handle.split('-')
  for (let i = parts.length - 1; i > 0; i--) {
    const prefix = parts.slice(0, i).join('-')
    if (CLUSTER_LINKS[prefix]) return CLUSTER_LINKS[prefix]
  }
  return null
}
