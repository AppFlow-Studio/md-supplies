import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'

type SitemapEntry = MetadataRoute.Sitemap[number]

const STATIC_URLS: SitemapEntry[] = [
  { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.9 },
  { url: `${SITE_URL}/industries`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/partners`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/solutions/occ`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${SITE_URL}/brands`, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/returns`, changeFrequency: 'monthly', priority: 0.4 },
]

/**
 * Returns the full sitemap URL list.
 *
 * - Staging: always returns empty (prevents staging URLs from being indexed).
 * - Production: static pages only for now.
 *
 * Dynamic entries (categories, subcategories, products, partners, industry
 * detail pages, blog articles) will be appended here once the Shopify data
 * feed is connected (A4 data phase).
 */
export function getSitemapUrls(isStaging: boolean = STAGING_GUARD): MetadataRoute.Sitemap {
  if (isStaging) return []
  return [...STATIC_URLS]
}
