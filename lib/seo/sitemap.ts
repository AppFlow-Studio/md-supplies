import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTIONS_FOR_SITEMAP } from '@/lib/shopify/queries/collections'
import { GET_ALL_PRODUCT_HANDLES } from '@/lib/shopify/queries/products'
import { GET_ALL_ARTICLE_HANDLES } from '@/lib/shopify/queries/blog'
import { PARTNERS } from '@/lib/partners'
import { CATEGORY_TREE_L1, buildL2Tree } from '@/lib/category-tree'
import { fetchProductTagSummaries } from '@/lib/category-tree-data.server'
import { INDUSTRIES } from '@/lib/industries'

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
  try {
    const data = await storefrontFetch<{
      collections: { nodes: { handle: string; updatedAt: string }[] }
    }>(GET_COLLECTIONS_FOR_SITEMAP, { first: 250 })
    const allowedHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))
    return data.collections.nodes
      .filter((c) => allowedHandles.has(c.handle))
      .map((c) => ({
        url: `${SITE_URL}/category/${c.handle}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        lastModified: new Date(c.updatedAt),
      }))
  } catch {
    return []
  }
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
          url: `${SITE_URL}/category/${l1.collectionHandle}/${node.tag}`,
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

export async function getSitemapUrls(): Promise<MetadataRoute.Sitemap> {
  const partnerUrls: SitemapEntry[] = PARTNERS.map(p => ({
    url: `${SITE_URL}/partners/${p.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Industry detail pages are index,follow content pages (built out with FAQs
  // in Priority #11), so they belong in the sitemap per closeout §12.2.
  const industryUrls: SitemapEntry[] = INDUSTRIES.map(i => ({
    url: `${SITE_URL}/industries/${i.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const [categoryUrls, subcategoryUrls, productUrls, articleUrls] = await Promise.all([
    fetchCategoryUrls(),
    fetchSubcategoryUrls(),
    fetchProductUrls(),
    fetchArticleUrls(),
  ])

  return [
    ...STATIC_URLS,
    ...categoryUrls,
    ...subcategoryUrls,
    ...productUrls,
    ...partnerUrls,
    ...industryUrls,
    ...articleUrls,
  ]
}
