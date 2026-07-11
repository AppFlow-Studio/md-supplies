import type { Metadata } from 'next'
import {
  CategoryPageView,
  buildCategoryMetadata,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'

export type { CategorySearchParams }

export const revalidate = 30

// Static/ISR canonical category page. This route deliberately does NOT read
// searchParams — a statically-generated route cannot access request state at
// runtime (it throws DYNAMIC_SERVER_USAGE). Requests carrying ?sort/filter/page
// are rewritten by proxy.ts onto the dynamic twin at /category-browse/[slug],
// which renders the same CategoryPageView with the query applied.
export function generateStaticParams(): { slug: string }[] {
  // Nothing prerendered at build (large catalog): each category renders on
  // first hit, caches per `revalidate`, and is invalidated by webhook tags.
  return []
}

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
