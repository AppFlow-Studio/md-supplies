import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION } from '@/lib/seo/constants'

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/logo.png`,
    },
  } as const
}
