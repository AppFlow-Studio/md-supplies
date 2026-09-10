import type { Metadata } from 'next'
import {
  CategoryPageView,
  buildCategoryMetadata,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'

export type { CategorySearchParams }

// THE canonical category route.
//
// Phase 3 (Cache Components): this route NO LONGER reads searchParams. The bare
// URL prerenders a FULLY STATIC default grid (page 1, no filters), so bare-URL
// crawler traffic costs zero function invocations. Filter/sort/search/pagination
// are client-side navigations handled inside CategoryFilterableGrid, which
// fetches the cached /api/catalog route — none of that touches this server
// render or its metadata. Reading searchParams here would (under cacheComponents)
// turn the whole route back into a per-request dynamic hole, which is exactly
// what this migration removes.
//
// generateStaticParams (exported from CategoryPageView) lists every L1 + the
// featured-subcategory slugs so those pages prerender ahead of time. Freshness
// comes from the fetch-level data cache tags + the Shopify webhook
// (app/api/revalidate), not route-level revalidate.

export { generateStaticParams } from '@/components/category/CategoryPageView'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return buildCategoryMetadata(slug)
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  return <CategoryPageView slug={slug} />
}
