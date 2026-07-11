/**
 * Single source of truth for the business NAP (Name / Address / Phone) and
 * public contact identity (M7, M12, M26, F2).
 *
 * NAP consistency is a trust + knowledge-panel signal: the SAME values must
 * appear in the footer, on /contact, and inside the Organization schema.
 * All three surfaces render from THIS module — never hardcode contact data
 * elsewhere.
 *
 * `phone` and `address` are null until the real business values arrive
 * (owner: Bilal). While null, the footer / contact page render no phone or
 * address block and the schema omits `telephone` / `address` — nothing fake
 * is ever published. To go live, replace the nulls below; every surface and
 * the schema update together.
 */

export type SitePostalAddress = {
  streetAddress: string
  addressLocality: string
  addressRegion: string
  postalCode: string
  addressCountry: string
}

export const SITE_CONTACT = {
  /** Public support inbox (also the contact-form recipient default). */
  email: 'team@mdsupplies.com',

  /** E.164 for tel: links and schema. TODO(Bilal): e.g. '+18005550100'. */
  phone: null as string | null,

  /** Human-readable phone for visible text. TODO(Bilal): e.g. '(800) 555-0100'. */
  phoneDisplay: null as string | null,

  /** Physical business address. TODO(Bilal). */
  address: null as SitePostalAddress | null,

  /** Canonical https profile — footer link and schema sameAs (F2). */
  linkedIn: 'https://www.linkedin.com/company/mdsupplies',
} as const

/** One-line address for visible NAP text, e.g. "1 Main St, Austin, TX 78701". */
export function formatAddress(a: SitePostalAddress): string {
  return `${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}`
}
