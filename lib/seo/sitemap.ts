import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS_FOR_SITEMAP } from '@/lib/shopify/queries/collections'
import { GET_ALL_PRODUCT_HANDLES } from '@/lib/shopify/queries/products'
import { GET_ALL_ARTICLE_HANDLES } from '@/lib/shopify/queries/blog'
import { PARTNERS } from '@/lib/partners'
import {
  CATEGORY_TREE_L1,
  buildL2Tree,
  getCategorySlug,
  FEATURED_SUBCATEGORIES,
} from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { SUPPORTED_INDUSTRIES } from '@/lib/industries'
import { STATIC_ARTICLES } from '@/lib/blog-static'

// Google's sitemap size limit is 50,000 URLs per file; this shards well
// below that so each child file stays small and independently
// fetchable/cacheable, and a Storefront hiccup mid-crawl only costs one
// shard's freshness instead of the whole catalog's (master plan §16 —
// "stable sharding is preferred").
export const PRODUCTS_PER_SITEMAP_SHARD = 2000

type SitemapEntry = MetadataRoute.Sitemap[number]

const STATIC_URLS: SitemapEntry[] = [
  { url: `${SITE_URL}/`,                changeFrequency: 'weekly',  priority: 1   },
  { url: `${SITE_URL}/categories`,      changeFrequency: 'weekly',  priority: 0.9 },
  { url: `${SITE_URL}/industries`,      changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/partners`,        changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/solutions/occ`,   changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/blog`,            changeFrequency: 'weekly',  priority: 0.7 },
  { url: `${SITE_URL}/about`,           changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/contact`,         changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/faq`,             changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/returns`,         changeFrequency: 'monthly', priority: 0.4 },
  { url: `${SITE_URL}/policies/privacy`,  changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/policies/terms`,    changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/policies/shipping`, changeFrequency: 'yearly', priority: 0.3 },
]

async function fetchCategoryUrls(): Promise<SitemapEntry[]> {
  // The REGISTRY decides which category routes exist; Shopify only supplies
  // lastmod. This used to iterate the Storefront collection list and keep the
  // handles that happened to be in the registry — an unpaginated `first: 250`
  // over a store with more collections than that, so whichever L1 collections
  // fell past the cutoff were silently absent. Measured 2026-08-12: 17 of the
  // 25 approved categories were in the sitemap and 8 were missing entirely
  // (needles-syringes, surgical-sutures, respiratory, disinfectants,
  // iv-therapy, urology-ostomy, sterilization, pharmacy-products) — all live,
  // indexable, linked-from-nav pages. Driving the list from the registry makes
  // the count structurally 25, and a Storefront failure now costs freshness
  // rather than the entries themselves.
  //
  // URLs use the CANONICAL public slug: listing the raw Shopify handle put a
  // redirecting URL (/category/face-coverings → /category/face-masks) in the
  // sitemap, which is what "only canonical, indexable, 200-status URLs" forbids.
  let lastModByHandle = new Map<string, string>()
  try {
    const data = await storefrontFetch<{
      collections: { nodes: { handle: string; updatedAt: string }[] }
    }>(GET_COLLECTIONS_FOR_SITEMAP, { first: 250 })
    lastModByHandle = new Map(data.collections.nodes.map((c) => [c.handle, c.updatedAt]))
  } catch {
    // Fall through: emit the routes without lastmod rather than dropping them.
  }

  const l1Urls = CATEGORY_TREE_L1.map((c) => {
    const updatedAt = lastModByHandle.get(c.collectionHandle)
    return {
      url: `${SITE_URL}/category/${getCategorySlug(c)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      // lastmod only when it is backed by a real Shopify updatedAt — never a
      // synthesized "now" that makes every URL look freshly changed.
      ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
    }
  })

  // Featured subcategories are canonical, indexable, nav-linked category pages
  // in their own right (Trocars & Trocar Kits), so they belong here. Priority
  // sits below an L1 and above an L2 tag route, matching their depth.
  const featuredUrls = FEATURED_SUBCATEGORIES.map((s) => {
    const updatedAt = lastModByHandle.get(s.collectionHandle)
    return {
      url: `${SITE_URL}/category/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
      ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
    }
  })

  return [...l1Urls, ...featuredUrls]
}

async function fetchSubcategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const summaries = await fetchProductTagSummaries()
    const l2Nodes = buildL2Tree(summaries)
    return l2Nodes
      .map((node): SitemapEntry | null => {
        const l1 = CATEGORY_TREE_L1.find((c) => c.tag === node.parentTag)
        if (!l1) return null
        return {
          url: `${SITE_URL}/category/${getCategorySlug(l1)}/${node.tag}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }
      })
      .filter((e): e is SitemapEntry => e !== null)
  } catch {
    return []
  }
}

type ProductHandlesResponse = {
  products: {
    nodes: { handle: string; updatedAt: string }[]
    pageInfo: { hasNextPage: boolean; endCursor: string }
  }
}

async function fetchProductUrls(): Promise<SitemapEntry[]> {
  const products: { handle: string; updatedAt: string }[] = []
  let cursor: string | null = null

  try {
    while (true) {
      const data: ProductHandlesResponse = await storefrontFetch<ProductHandlesResponse>(
        GET_ALL_PRODUCT_HANDLES, { first: 250, after: cursor },
      )

      products.push(...data.products.nodes)

      const nextCursor = data.products.pageInfo.endCursor
      if (!data.products.pageInfo.hasNextPage || !nextCursor || nextCursor === cursor) break
      cursor = nextCursor
    }
  } catch {
    return []
  }

  return products.map(p => ({
    url: `${SITE_URL}/product/${p.handle}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
    lastModified: new Date(p.updatedAt),
  }))
}

async function fetchArticleUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{
      blogs: {
        nodes: { handle: string; articles: { nodes: { handle: string; publishedAt: string }[] } }[]
      }
    }>(GET_ALL_ARTICLE_HANDLES)

    return data.blogs.nodes.flatMap(blog =>
      blog.articles.nodes.map(a => ({
        url: `${SITE_URL}/blog/${a.handle}`,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
        lastModified: new Date(a.publishedAt),
      })),
    )
  } catch {
    return []
  }
}

/**
 * Every sitemap URL except products: static pages, categories, L2
 * subcategories, partners, industries, and blog articles. Small and mostly
 * static — one shard (id 'content' in app/sitemaps/sitemap.ts) is enough
 * for all of it, distinct from the product shards below which scale with
 * the live catalog.
 */
export async function getContentSitemapUrls(): Promise<MetadataRoute.Sitemap> {
  const partnerUrls: SitemapEntry[] = PARTNERS.map(p => ({
    url: `${SITE_URL}/partners/${p.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Industry detail pages are index,follow content pages (built out with FAQs
  // in Priority #11), so they belong in the sitemap per closeout §12.2.
  // Only industries with unique content AND a validated assortment. The
  // sitemap previously listed all twelve while seven of them served noindex,
  // which asks Google to crawl URLs that then refuse indexing.
  const industryUrls: SitemapEntry[] = SUPPORTED_INDUSTRIES.map(i => ({
    url: `${SITE_URL}/industries/${i.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Static blog articles (not in Shopify — must be included separately).
  const staticArticleUrls: SitemapEntry[] = Object.keys(STATIC_ARTICLES).map((handle) => ({
    url: `${SITE_URL}/blog/${handle}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const [categoryUrls, subcategoryUrls, articleUrls] = await Promise.all([
    fetchCategoryUrls(),
    fetchSubcategoryUrls(),
    fetchArticleUrls(),
  ])

  // Merge Shopify article URLs with static article URLs, deduplicating by URL.
  const shopifyArticleHandles = new Set(
    articleUrls.map((e) => e.url.split('/blog/')[1]),
  )
  const deduplicatedStaticUrls = staticArticleUrls.filter(
    (e) => !shopifyArticleHandles.has(e.url.split('/blog/')[1]),
  )

  return [
    ...STATIC_URLS,
    ...categoryUrls,
    ...subcategoryUrls,
    ...partnerUrls,
    ...industryUrls,
    ...articleUrls,
    ...deduplicatedStaticUrls,
  ]
}

/** Number of product shards needed for the current live catalog size. */
export async function getProductShardCount(): Promise<number> {
  const urls = await fetchProductUrls()
  return Math.max(1, Math.ceil(urls.length / PRODUCTS_PER_SITEMAP_SHARD))
}

/** The product URLs belonging to one shard, 0-indexed. */
export async function getProductSitemapUrls(shardIndex: number): Promise<MetadataRoute.Sitemap> {
  const urls = await fetchProductUrls()
  const start = shardIndex * PRODUCTS_PER_SITEMAP_SHARD
  return urls.slice(start, start + PRODUCTS_PER_SITEMAP_SHARD)
}

/**
 * Full, unsharded sitemap — content URLs plus every product. Kept for any
 * caller that wants the complete set in one call (and as the function this
 * file's existing test coverage was written against); app/sitemaps/sitemap.ts
 * itself now calls getContentSitemapUrls/getProductSitemapUrls directly
 * instead, to get the sharded index behavior.
 */
export async function getSitemapUrls(): Promise<MetadataRoute.Sitemap> {
  const [contentUrls, productUrls] = await Promise.all([
    getContentSitemapUrls(),
    fetchProductUrls(),
  ])
  return [...contentUrls, ...productUrls]
}
