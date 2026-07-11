import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION } from '@/lib/seo/constants'
import { LOGO_PATH } from '@/lib/bunnycdn'
import { SITE_CONTACT } from '@/lib/site-contact'

// Organization identity (M7/M12/M26): address, contactPoint, and sameAs are
// sourced from lib/site-contact.ts — the SAME module the footer and /contact
// render from, so the schema always matches the visible NAP. Optional fields
// (telephone/address) appear only once real values are filled in there;
// nothing fabricated is ever emitted.
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}${LOGO_PATH}`,
    },
    sameAs: [SITE_CONTACT.linkedIn],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE_CONTACT.email,
      ...(SITE_CONTACT.phone ? { telephone: SITE_CONTACT.phone } : {}),
    },
    ...(SITE_CONTACT.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: SITE_CONTACT.address.streetAddress,
            addressLocality: SITE_CONTACT.address.addressLocality,
            addressRegion: SITE_CONTACT.address.addressRegion,
            postalCode: SITE_CONTACT.address.postalCode,
            addressCountry: SITE_CONTACT.address.addressCountry,
          },
        }
      : {}),
  } as const
}
