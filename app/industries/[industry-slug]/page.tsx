import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { INDUSTRIES, isIndustryComplete } from '@/lib/industries'
import { IndustryPage } from '@/components/b2b/IndustryPage'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { getSubcategories } from '@/lib/category-utils'
import type { Industry } from '@/types/industry'
import type { CollectionProduct } from '@/lib/shopify/types'

export const revalidate = 3600

interface Props {
  params: Promise<{ 'industry-slug': string }>
}

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ 'industry-slug': i.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const industry = INDUSTRIES.find((i) => i.slug === slug)
  if (!industry) return {}
  return buildMetadata({
    pageType: 'industry',
    title: `${industry.name} Medical Supplies — MDSupplies`,
    description: industry.description,
    slug: industry.slug,
    // Thin pages (awaiting client FAQ copy) stay out of the index until complete.
    noIndex: !isIndustryComplete(industry),
  })
}

export default async function IndustryDetailPage({ params }: Props) {
  const { 'industry-slug': slug } = await params

  const industryStatic = INDUSTRIES.find((i) => i.slug === slug)
  if (!industryStatic) notFound()

  let relevantProducts: Industry['relevantProducts'] = []
  const [collectionResult, subcategoryResult] = await Promise.allSettled([
    storefrontFetch<{
      collection: { products: { nodes: CollectionProduct[] } } | null
    }>(GET_COLLECTION, {
      handle: industryStatic.collectionHandle,
      first: 6,
      after: null,
      sortKey: 'BEST_SELLING',
      reverse: false,
    }),
    getSubcategories(industryStatic.collectionHandle),
  ])

  if (collectionResult.status === 'fulfilled' && collectionResult.value.collection) {
    relevantProducts = collectionResult.value.collection.products.nodes.map((p) => ({
      handle: p.handle,
      title: p.title,
      image: p.images.nodes[0]?.url ?? '',
      price: Math.round(parseFloat(p.priceRange.minVariantPrice.amount) * 100),
    }))
  }

  const subcategories =
    subcategoryResult.status === 'fulfilled' ? subcategoryResult.value : []

  const industry: Industry = {
    slug: industryStatic.slug,
    name: industryStatic.name,
    isPopulated: relevantProducts.length > 0,
    intro: industryStatic.description,
    buyerType: industryStatic.buyerType,
    heroImage: industryStatic.image
      ? { url: industryStatic.image, altText: `${industryStatic.name} supplies` }
      : undefined,
    relevantCategories: [
      { handle: industryStatic.collectionHandle, title: industryStatic.name },
    ],
    relevantSubcategories: subcategories.map((s) => ({
      handle: `${industryStatic.collectionHandle}-${s.slug}`,
      title: s.label,
    })),
    relevantProducts,
    relatedGuides: [],
    ctaText: `Browse ${industryStatic.name} Supplies`,
    ctaLink: `/category/${industryStatic.collectionHandle}`,
    faq: industryStatic.faq,
  }

  return <IndustryPage industry={industry} />
}
