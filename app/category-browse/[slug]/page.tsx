import type { Metadata } from 'next'
import {
  CategoryPageView,
  buildCategoryMetadata,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'

// Dynamic twin of /category/[slug] for query variants (?sort/filter/page).
// proxy.ts rewrites /category/<slug>?<query> here, so visitors keep the
// canonical URL in the address bar while this route renders per-request.
// Direct hits are harmless: metadata canonicalizes back to /category/<slug>
// (and filtered views are noindex).

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<CategorySearchParams>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  return buildCategoryMetadata(slug, sp)
}

export default async function CategoryBrowsePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  return <CategoryPageView slug={slug} sp={sp} />
}
