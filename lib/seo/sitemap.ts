import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections'
import { GET_ALL_PRODUCT_HANDLES } from '@/lib/shopify/queries/products'
import { GET_ALL_ARTICLE_HANDLES } from '@/lib/shopify/queries/blog'
import { PARTNERS } from '@/lib/partners'

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
]

function isExcludedCollectionHandle(handle: string): boolean {
  return handle === 'brands' || handle.startsWith('brands-')
}

async function fetchCategoryUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{ collections: { nodes: { handle: string }[] } }>(
      GET_COLLECTIONS,
      { first: 250 },
    )
    return data.collections.nodes
      .filter(c => !isExcludedCollectionHandle(c.handle))
      .map(c => ({
        url: `${SITE_URL}/category/${c.handle}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch {
    return []
  }
}

type ProductHandlesResponse = {
  products: {
    nodes: { handle: string }[]
    pageInfo: { hasNextPage: boolean; endCursor: string }
  }
}

async function fetchProductUrls(): Promise<SitemapEntry[]> {
  const handles: string[] = []
  let cursor: string | null = null

  try {
    while (true) {
      const data: ProductHandlesResponse = await storefrontFetch<ProductHandlesResponse>(
        GET_ALL_PRODUCT_HANDLES, { first: 250, after: cursor },
      )

      for (const p of data.products.nodes) handles.push(p.handle)

      const nextCursor = data.products.pageInfo.endCursor
      if (!data.products.pageInfo.hasNextPage || !nextCursor || nextCursor === cursor) break
      cursor = nextCursor
    }
  } catch {
    return []
  }

  return handles.map(h => ({
    url: `${SITE_URL}/product/${h}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
}

async function fetchArticleUrls(): Promise<SitemapEntry[]> {
  try {
    const data = await storefrontFetch<{
      blogs: { nodes: { handle: string; articles: { nodes: { handle: string }[] } }[] }
    }>(GET_ALL_ARTICLE_HANDLES)

    return data.blogs.nodes.flatMap(blog =>
      blog.articles.nodes.map(a => ({
        url: `${SITE_URL}/blog/${a.handle}`,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    )
  } catch {
    return []
  }
}

export async function getSitemapUrls(
  isStaging: boolean = STAGING_GUARD,
): Promise<MetadataRoute.Sitemap> {
  if (isStaging) return []

  const partnerUrls: SitemapEntry[] = PARTNERS.map(p => ({
    url: `${SITE_URL}/partners/${p.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const [categoryUrls, productUrls, articleUrls] = await Promise.all([
    fetchCategoryUrls(),
    fetchProductUrls(),
    fetchArticleUrls(),
  ])

  return [
    ...STATIC_URLS,
    ...categoryUrls,
    ...productUrls,
    ...partnerUrls,
    ...articleUrls,
  ]
}
