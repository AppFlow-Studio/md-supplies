import { SITE_NAME, SITE_URL } from '@/lib/seo/constants'

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url: SITE_URL,
  } as const
}
