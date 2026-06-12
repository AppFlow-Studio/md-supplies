import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'

/**
 * Returns the robots.txt configuration for the site.
 *
 * Required environment variables (set in deployment, not in .env.local):
 *  - NEXT_PUBLIC_SITE_URL=https://mdsupplies.com  (canonical production domain)
 *  - NEXT_PUBLIC_IS_STAGING=true                   (staging deployments only — forces noindex)
 */
export function getRobotsConfig(isStaging: boolean = STAGING_GUARD): MetadataRoute.Robots {
  if (isStaging) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account/', '/cart', '/search', '/internal/', '/b2b'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
