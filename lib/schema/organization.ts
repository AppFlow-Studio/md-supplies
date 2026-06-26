import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION } from '@/lib/seo/constants'
import { LOGO_PATH } from '@/lib/bunnycdn'

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
  } as const
}
