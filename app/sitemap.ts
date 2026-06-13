import type { MetadataRoute } from 'next'
import { getSitemapUrls } from '@/lib/seo/sitemap'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapUrls()
}
