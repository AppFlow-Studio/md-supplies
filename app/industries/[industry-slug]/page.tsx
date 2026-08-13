import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { SITE_URL } from '@/lib/seo/constants'
import { getIndustrySeo } from '@/lib/seo/industrySeo'
import { INDUSTRIES, isIndustryIndexable, hasValidatedAssortment } from '@/lib/industries'
import { IndustryPage } from '@/components/b2b/IndustryPage'
import { IndustryLandingPage } from '@/components/b2b/IndustryLandingPage'
import {
  parseSortKey,
  parseFilterParam,
  parseSearchParam,
  type CategorySearchParams,
} from '@/components/category/CategoryPageView'
import { parsePageSize, DEFAULT_PAGE_SIZE } from '@/lib/catalog/page-size'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_COLLECTION } from '@/lib/shopify/queries/collections'
import { getSubcategories } from '@/lib/category-utils'
import { getIndustryCategoryLinks, getIndustryBuyingGuide } from '@/lib/industry-content'
import type { Industry as IndustryView } from '@/types/industry'
import type { CollectionProduct } from '@/lib/shopify/types'

interface Props {
  params: Promise<{ 'industry-slug': string }>
  searchParams: Promise<CategorySearchParams>
}

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ 'industry-slug': i.slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const sp = await searchParams
  const industry = INDUSTRIES.find((i) => i.slug === slug)
  if (!industry) return {}

  const seoDB = getIndustrySeo(slug)
  const canonical = `${SITE_URL}/industries/${industry.slug}`

  // Filter/sort/search/page variants are noindex and canonicalize to the clean
  // industry URL, so faceted combinations cannot multiply in the index.
  const isQueryVariant =
    parseFilterParam(sp.filter).length > 0 ||
    Boolean(sp.sort) ||
    Boolean(parseSearchParam(sp.q)) ||
    Boolean(sp.page) ||
    // Same reason as the category route: ?per_page= is the same content in a
    // different quantity, not a distinct indexable page.
    parsePageSize(sp.per_page) !== DEFAULT_PAGE_SIZE

  const base = buildMetadata({
    pageType: 'industry',
    title: industry.name,
    description: seoDB?.metaDescription ?? industry.description,
    slug: industry.slug,
    image: `${SITE_URL}${industry.image}`,
    // Thin OR unbacked by products ⇒ noindex,follow (lib/industries.ts).
    noIndex: !isIndustryIndexable(industry) || isQueryVariant,
    canonical,
  })

  if (seoDB) {
    const og = (base.openGraph ?? {}) as Record<string, unknown>
    return {
      ...base,
      title: seoDB.title,
      description: seoDB.metaDescription,
      openGraph: { ...og, title: seoDB.title, description: seoDB.metaDescription },
    }
  }

  return base
}

export default async function IndustryDetailPage({ params, searchParams }: Props) {
  const { 'industry-slug': slug } = await params
  const sp = await searchParams

  const industryStatic = INDUSTRIES.find((i) => i.slug === slug)
  if (!industryStatic) notFound()

  // ── Supported industries: the full ecommerce landing page ────────────────
  // Anything with a validated assortment renders the same product-discovery
  // system as category and OCC pages, not a six-product teaser.
  if (hasValidatedAssortment(industryStatic)) {
    const activeFilterStrings = parseFilterParam(sp.filter)
    const { sortKey, reverse } = parseSortKey(sp.sort)
    const searchQuery = parseSearchParam(sp.q)
    const currentPage = parseInt(sp.page ?? '1', 10)
    if (isNaN(currentPage) || currentPage < 1) notFound()

    return (
      <IndustryLandingPage
        industry={industryStatic}
        tag={industryStatic.tag!}
        sp={sp}
        sortKey={sortKey}
        reverse={reverse}
        searchQuery={searchQuery}
        activeFilterStrings={activeFilterStrings}
        currentPage={currentPage}
        categoryLinks={getIndustryCategoryLinks(industryStatic.slug)}
        buyingGuide={getIndustryBuyingGuide(industryStatic.slug)}
        pageSize={parsePageSize(sp.per_page)}
        seoAnswer={getIndustrySeo(slug)?.answerBlock}
      />
    )
  }

  // ── Unsupported industries: the existing lightweight page, noindexed ─────
  // No products are invented to fill these; they stay out of the sitemap, the
  // Industries grid and the homepage strip (lib/industries.ts).
  const productsPromise: Promise<CollectionProduct[]> = storefrontFetch<{
    collection: { products: { nodes: CollectionProduct[] } } | null
  }>(GET_COLLECTION, {
    handle: industryStatic.collectionHandle,
    first: 6,
    after: null,
    sortKey: 'BEST_SELLING',
    reverse: false,
  }).then((data) => data.collection?.products.nodes ?? [])

  const [productsResult, subcategoryResult] = await Promise.allSettled([
    productsPromise,
    getSubcategories(industryStatic.collectionHandle),
  ])

  const relevantProducts: IndustryView['relevantProducts'] =
    productsResult.status === 'fulfilled' ? productsResult.value : []
  const subcategories = subcategoryResult.status === 'fulfilled' ? subcategoryResult.value : []
  const seoDB = getIndustrySeo(slug)

  const industry: IndustryView = {
    slug: industryStatic.slug,
    name: industryStatic.name,
    isPopulated: relevantProducts.length > 0,
    intro: seoDB?.answerBlock ?? industryStatic.description,
    seoTitle: seoDB?.title,
    seoDescription: seoDB?.metaDescription,
    buyerType: industryStatic.buyerType,
    heroImage: industryStatic.image
      ? { url: industryStatic.image, altText: `${industryStatic.name} supplies` }
      : undefined,
    relevantCategories: [{ handle: industryStatic.collectionHandle, title: industryStatic.name }],
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
