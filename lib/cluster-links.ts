// lib/cluster-links.ts

export interface ClusterLinks {
  industryLinks: { slug: string; name: string }[]
  partnerLinks:  { slug: string; name: string }[]
  occEligible:   boolean
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

  'needles-syringes': {
    industryLinks: [
      { slug: 'hrt-clinics',    name: 'HRT Clinics' },
      { slug: 'urgent-care',    name: 'Urgent Care' },
      { slug: 'veterinary',     name: 'Veterinary' },
    ],
    partnerLinks: [
      { slug: 'dynarex', name: 'Dynarex' },
    ],
    occEligible: false,
  },

  'surgical-sutures': {
    industryLinks: [
      { slug: 'private-practice', name: 'Private Practice' },
      { slug: 'urgent-care',      name: 'Urgent Care' },
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
