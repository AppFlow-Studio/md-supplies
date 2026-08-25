import type { MetadataRoute } from 'next'
import { getContentSitemapUrls, getProductSitemapUrls, getProductShardCount } from '@/lib/seo/sitemap'

// Sitemap index + sharded children (master plan §16). Next auto-serves the
// index at /sitemap.xml from the ids below, each resolving to /sitemap/
// <id>.xml. 'content' covers every non-product URL (small, mostly static);
// 'products-N' shards the live catalog at PRODUCTS_PER_SITEMAP_SHARD per
// file so no single file's size tracks the whole catalog and a Storefront
// hiccup only costs one shard's freshness.
export async function generateSitemaps() {
  const shardCount = await getProductShardCount()
  return [
    { id: 'content' },
    ...Array.from({ length: shardCount }, (_, i) => ({ id: `products-${i}` })),
  ]
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const shardId = await id
  if (shardId === 'content') return getContentSitemapUrls()
  const match = shardId.match(/^products-(\d+)$/)
  if (match) return getProductSitemapUrls(Number(match[1]))
  return []
}
