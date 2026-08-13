// DEV-SEO-01 / plan §2.1 — approved-claims register.
//
// Every quantitative or performance claim shown to customers ("12,000+
// Facilities", "99.8% Order Accuracy", "Fast Shipping", catalog counts) must
// have a written source, an evidence date, and client approval. The plan
// lists all of these as BLOCKED pending that evidence (IZ-PROD-09), so each
// entry below ships DISABLED and the UI renders nothing in its place.
//
// To enable a claim after approval: set `approved: true`, fill in `source`
// and `evidenceDate` with the written evidence, and confirm `text` matches
// the approved wording exactly. Do not invent a replacement number to fill a
// gap — an unapproved claim renders as absent, not as a rounded guess.

export type ClaimKey =
  | 'facilitiesServed'
  | 'orderAccuracy'
  | 'shippingSpeed'
  | 'productCount'

export type Claim = {
  /** Exact approved customer-facing wording. */
  text: string
  /** Secondary label (e.g. the stat's caption). */
  label?: string
  /** Where the number came from (document, dashboard, written approval). */
  source: string | null
  /** ISO date of the evidence. */
  evidenceDate: string | null
  /** Client-approved in writing. Unapproved claims never render. */
  approved: boolean
}

export const CLAIMS: Record<ClaimKey, Claim> = {
  facilitiesServed: {
    text: '12,000+',
    label: 'Facilities',
    source: null,
    evidenceDate: null,
    approved: false,
  },
  orderAccuracy: {
    text: '99.8%',
    label: 'Order Accuracy',
    source: null,
    evidenceDate: null,
    approved: false,
  },
  shippingSpeed: {
    text: 'Fast',
    label: 'Shipping',
    source: null,
    evidenceDate: null,
    approved: false,
  },
  productCount: {
    // The plan explicitly forbids treating 7,384 / 7,385 / 8,000+ / 10,000+ /
    // 12,000+ as interchangeable. Blocked until IZ-PROD-09's dated census.
    text: '8,000+',
    label: 'Products',
    source: null,
    evidenceDate: null,
    approved: false,
  },
}

/** True only when the claim has written source + date + approval. */
export function isClaimApproved(key: ClaimKey): boolean {
  const c = CLAIMS[key]
  return c.approved && Boolean(c.source) && Boolean(c.evidenceDate)
}

/** Approved claim text, or null when the claim may not be shown. */
export function getClaim(key: ClaimKey): Claim | null {
  return isClaimApproved(key) ? CLAIMS[key] : null
}

/** Filters a list of claim keys down to the ones that may render. */
export function approvedClaims(keys: ClaimKey[]): { key: ClaimKey; claim: Claim }[] {
  return keys.flatMap((key) => {
    const claim = getClaim(key)
    return claim ? [{ key, claim }] : []
  })
}
