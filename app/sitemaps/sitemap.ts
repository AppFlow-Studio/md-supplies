import type { MetadataRoute } from 'next'
import { getContentSitemapUrls, getProductSitemapUrls, getProductShardCount } from '@/lib/seo/sitemap'

// Sharded sitemap children (master plan §16), served via Next's native
// generateSitemaps() convention at /sitemaps/sitemap/<id>.xml — one file
// per id below. 'content' covers every non-product URL (small, mostly
// static); 'products-N' shards the live catalog at
// PRODUCTS_PER_SITEMAP_SHARD per file so no single file's size tracks the
// whole catalog and a Storefront hiccup only costs one shard's freshness.
//
// This file lives at app/sitemaps/sitemap.ts rather than the app-root
// app/sitemap.ts because a root-level generateSitemaps-exporting special
// file computes the same internal build-time route key as the hand-built
// sitemap index at app/sitemap.xml/route.ts, and Next's build refuses to
// proceed ("Conflicting route and metadata at /sitemap.xml: route at
// /sitemap.xml/route and metadata at /sitemap.xml/route") — even though
// that special file never actually serves the bare /sitemap.xml path at
// runtime (it only serves /sitemap/[id].xml). Nesting under app/sitemaps/
// moves this file's route key off /sitemap.xml entirely, resolving the
// conflict. The real /sitemap.xml — a <sitemapindex> referencing this
// file's shard children — is hand-built separately at
// app/sitemap.xml/route.ts, since Next 16.2.12 does not auto-generate one
// for the generateSitemaps convention.
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
