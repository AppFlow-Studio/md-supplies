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

  // SEO-CATEGORY-01 §7/§8: the Trocars & Trocar Kits `categorySeo.ts` entry
  // already researched and approved these links (HRT Clinics industry,
  // Kadara Medical brand, and a reciprocal Needles & Syringes cross-sell —
  // trocar kits ship with a syringe, see the FAQ's kit-contents answer) but
  // had no CLUSTER_LINKS entry to actually render them.
  'trocars-trocar-kits': {
    industryLinks: [
      { slug: 'hrt-clinics', name: 'HRT Clinics' },
    ],
    partnerLinks: [
      { slug: 'kadara', name: 'Kadara Medical' },
    ],
    categoryLinks: [
      { slug: 'needles-syringes', name: 'Needles & Syringes' },
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
