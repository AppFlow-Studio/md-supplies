import type { Metadata } from 'next'
import {
  CategoryPageView,
  buildCategoryMetadata,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'

export type { CategorySearchParams }

// Canonical category page — fully dynamic (root layout reads headers() for
// the CSP nonce, M10, so this route can't be static/ISR'd; see the trade-off
// note in app/layout.tsx). Freshness comes from the fetch-level data cache
// (CategoryPageView's storefrontFetch calls), not route-level revalidate.
// This route deliberately does NOT read searchParams — requests carrying
// ?sort/filter/page are rewritten by proxy.ts onto the twin at
// /category-browse/[slug], which renders the same CategoryPageView with the
// query applied.

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return buildCategoryMetadata(slug, {})
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  return <CategoryPageView slug={slug} sp={{}} />
}
