import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/seo/constants'
import { getProductShardCount } from '@/lib/seo/sitemap'

// app/sitemaps/sitemap.ts (the special metadata-convention file, nested
// under a route segment per node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/01-metadata/sitemap.md's "Generating
// multiple sitemaps" section) exports generateSitemaps() and serves ONLY
// /sitemaps/sitemap/<id>.xml. It used to live at the app root as
// app/sitemap.ts, but this fork's Next 16.2.12 computes the same internal
// route key for a root-level app/sitemap.ts (even though it only ever
// serves /sitemap/[id].xml at runtime) and this hand-built
// app/sitemap.xml/route.ts, and refuses to build with a route conflict —
// confirmed against node_modules/next/dist/build/webpack/loaders/
// next-metadata-route-loader.js, no index-generation code path exists there
// either way. Nesting the special file frees the literal /sitemap.xml URL
// for this route, which hand-builds the index the same documented pattern
// as app/rss.xml/route.ts (node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/route.md#non-ui-responses).
export async function GET() {
  const shardCount = await getProductShardCount()
  const shardUrls = [
    `${SITE_URL}/sitemaps/sitemap/content.xml`,
    ...Array.from({ length: shardCount }, (_, i) => `${SITE_URL}/sitemaps/sitemap/products-${i}.xml`),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${shardUrls.map((url) => `  <sitemap>\n    <loc>${url}</loc>\n  </sitemap>`).join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
