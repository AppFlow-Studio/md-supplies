import type { Metadata } from 'next'
import {
  CategoryPageView,
  buildCategoryMetadata,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'

export type { CategorySearchParams }

// THE canonical category route. It reads searchParams directly, so filter,
// sort, search and pagination are ordinary App Router client navigations
// within one route segment — no rewrite, no twin route, no remount.
//
// History: this route used to refuse searchParams, and proxy.ts rewrote
// /category/<slug>?<query> onto a duplicate at /category-browse/<slug>. That
// existed because the route was statically generated and could not read the
// query at request time. Since the root layout began reading headers() for the
// CSP nonce (M10) every route renders per-request anyway, so the twin only
// added a route-boundary change between the clean and filtered views — which
// is what made filtering feel like a full page load. Both are now gone.
//
// Freshness comes from the fetch-level data cache in CategoryPageView, not
// route-level revalidate.

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<CategorySearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  return buildCategoryMetadata(slug, sp)
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  return <CategoryPageView slug={slug} sp={sp} />
}
