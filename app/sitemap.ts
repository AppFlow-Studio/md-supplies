import type { MetadataRoute } from 'next'
import { getSitemapUrls } from '@/lib/seo/sitemap'

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapUrls()
}
