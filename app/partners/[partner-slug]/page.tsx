import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Tag } from 'lucide-react'
import { AnimatedArrow } from '@/components/ui/AnimatedArrow'
import { buildMetadata } from '@/lib/seo'
import { getPartnerBySlug, PARTNERS } from '@/lib/partners'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS_BY_VENDOR } from '@/lib/shopify/queries/products'
import type { CollectionProduct } from '@/lib/shopify/types'
import { FeaturedProductCard } from '@/components/b2b/FeaturedProductCard'
import { WholesalePricing } from '@/components/home/WholesalePricing'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { FadeIn } from '@/components/ui/FadeIn'
import { BrandLogoImage } from '@/components/shared/BrandLogoImage'
import { SITE_URL } from '@/lib/seo/constants'

interface Props {
  params: Promise<{ 'partner-slug': string }>
}

async function fetchFeaturedProducts(vendorName: string): Promise<CollectionProduct[]> {
  try {
    const data = await storefrontFetch<{
      products: { nodes: CollectionProduct[] }
    }>(GET_PRODUCTS_BY_VENDOR, {
      query: `vendor:"${vendorName}"`,
      first: 4,
      after: null,
      sortKey: 'BEST_SELLING',
      reverse: false,
    })
    return data.products.nodes
  } catch {
    return []
  }
}

// Entity structure verified: H1 ✓ | intro ✓ | type badge ✓ | categories ✓ | products ✓ | schema ✓

export function generateStaticParams() {
  return PARTNERS
    .filter((p) => p.isActive)
    .map((p) => ({ 'partner-slug': p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner) return {}

  return buildMetadata({
    pageType: 'partner-detail',
    title: partner.seoTitle || partner.name,
    description: partner.seoDescription || partner.description,
    slug: partner.slug,
    image: partner.logo.url,
  })
}

export default async function PartnerDetailPage({ params }: Props) {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)

  if (!partner || !partner.isActive) notFound()

  const pageUrl = `${SITE_URL}/partners/${partner.slug}`
  const pageDescription = partner.seoDescription || partner.description

  const [featuredProducts, otherPartners] = await Promise.all([
    fetchFeaturedProducts(partner.vendorName),
    Promise.resolve(
      PARTNERS.filter((p) => p.isActive && p.slug !== partner.slug).slice(0, 3)
    ),
  ])

  return (
    <main className="bg-white">
      <WebPageSchema
        name={partner.seoTitle || partner.name}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: SITE_URL },
          { name: 'Partners', item: `${SITE_URL}/partners` },
          { name: partner.name, item: pageUrl },
        ]}
      />

      {/* ── Hero ── */}
      <div className="w-full bg-navy-900 h-[220px] sm:h-[300px] lg:h-[360px] relative overflow-hidden flex items-end">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center lg:justify-start lg:pl-[61px]">
          <FadeIn>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-10 py-6 flex items-center justify-center min-w-[200px] min-h-[100px]">
              <BrandLogoImage
                src={partner.logo.url || undefined}
                name={partner.name}
                className="max-h-14 max-w-[220px] w-auto object-contain brightness-0 invert"
                fallbackClassName="text-center font-bold text-[22px] tracking-[0.04em] text-white select-none"
              />
            </div>
          </FadeIn>
        </div>

        <div className="relative z-10 w-full">
          <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-5">
            <nav className="flex items-center gap-2 text-[13px] tracking-[0.26px]">
              <Link href="/" className="text-white/60 hover:text-white transition-colors">Home</Link>
              <span className="text-white/30">›</span>
              <Link href="/partners" className="text-white/60 hover:text-white transition-colors">Partners</Link>
              <span className="text-white/30">›</span>
              <span className="text-white/90 font-medium">{partner.name}</span>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 items-start">

          {/* ── Left: main content ── */}
          <div className="flex-1 min-w-0">

            <FadeIn delay={0}>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h1 className="text-navy-900 text-[28px] sm:text-[36px] lg:text-[42px] font-semibold leading-[1.2] tracking-[-0.01em]">
                  {partner.name}
                </h1>
                <span
                  className={`shrink-0 text-[12px] font-semibold uppercase tracking-[0.4px] px-3 py-1.5 rounded-full ${
                    partner.type === 'brand'
                      ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20'
                      : 'bg-navy-900/10 text-navy-900 border border-navy-900/20'
                  }`}
                >
                  {partner.type === 'brand' ? 'Brand' : 'Vendor / Distributor'}
                </span>
              </div>
              <hr className="border-gray-200 mb-6" />
            </FadeIn>

            <FadeIn delay={0.08}>
              <p className="text-teal-500 text-[13px] font-semibold tracking-[0.65px] uppercase mb-3">
                About
              </p>
              <p className="text-gray-600 text-[16px] leading-[1.75] mb-8">
                {partner.intro}
              </p>
            </FadeIn>

            {partner.relatedCategories.length > 0 && (
              <FadeIn delay={0.12}>
                <div className="mb-8">
                  <p className="text-teal-500 text-[13px] font-semibold tracking-[0.65px] uppercase mb-4">
                    Product Categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {partner.relatedCategories.map((cat) => (
                      <Link
                        key={cat.handle}
                        href={`/category/${cat.handle}`}
                        className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 bg-[#f9fafc] text-[14px] text-navy-900 font-medium hover:border-teal-500 hover:text-teal-500 transition-colors rounded-full"
                      >
                        <Tag size={13} />
                        {cat.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

            {partner.type === 'vendor' && partner.relatedBrands && partner.relatedBrands.length > 0 && (
              <FadeIn delay={0.15}>
                <div className="mb-8">
                  <p className="text-teal-500 text-[13px] font-semibold tracking-[0.65px] uppercase mb-4">
                    Related Brands
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {partner.relatedBrands.map((brandSlug) => {
                      const brand = PARTNERS.find((p) => p.slug === brandSlug)
                      return (
                        <Link
                          key={brandSlug}
                          href={`/partners/${brandSlug}`}
                          className="px-4 py-2 border border-gray-200 bg-[#f9fafc] text-[14px] text-navy-900 font-medium hover:border-teal-500 hover:text-teal-500 transition-colors rounded-full capitalize"
                        >
                          {brand?.name ?? brandSlug.replace(/-/g, ' ')}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </FadeIn>
            )}

            {featuredProducts.length > 0 && (
              <FadeIn delay={0.18}>
                <div className="mt-10 pt-10 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-navy-900 text-[20px] font-semibold tracking-tight">
                      Featured Products
                    </p>
                    <Link
                      href={`/partners/${partner.slug}/products`}
                      className="group text-teal-500 text-[14px] font-semibold flex items-center gap-1"
                    >
                      View all <AnimatedArrow size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {featuredProducts.map((p) => (
                      <FeaturedProductCard
                        key={p.handle}
                        product={{
                          handle: p.handle,
                          title: p.title,
                          image: p.images.nodes[0]?.url ?? '',
                          price: Math.round(
                            parseFloat(p.priceRange.minVariantPrice.amount) * 100
                          ),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

            <FadeIn delay={0.2}>
              <div className="mt-12 pt-8 border-t border-gray-200">
                <Link
                  href="/partners"
                  className="inline-flex items-center gap-2 text-navy-900 text-[14px] font-semibold hover:text-teal-500 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to all partners
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* ── Right: sidebar ── */}
          <aside className="w-full lg:w-[300px] xl:w-[340px] shrink-0 lg:sticky lg:top-[100px] flex flex-col gap-5">

            <FadeIn delay={0}>
              <div className="bg-navy-900 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <Package size={18} className="text-white" />
                  </div>
                  <p className="text-white font-semibold text-[15px] leading-tight">
                    Shop {partner.name} Products
                  </p>
                </div>
                <p className="text-white/70 text-[13px] leading-[1.6]">
                  Browse the full {partner.name} catalog on MDSupplies at wholesale pricing for healthcare providers.
                </p>
                <Link
                  href={`/partners/${partner.slug}/products`}
                  className="bg-teal-500 text-white text-[14px] font-semibold px-5 py-3 hover:bg-teal-400 transition-colors text-center"
                >
                  Browse Products
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.06}>
              <div className="bg-[#f9fafc] border border-gray-200 p-6 flex flex-col gap-3">
                <p className="text-navy-900 font-semibold text-[15px]">Wholesale Inquiries</p>
                <p className="text-gray-500 text-[13px] leading-[1.6]">
                  Interested in bulk pricing or becoming a distribution partner? Get in touch with our team.
                </p>
                <Link
                  href="/contact"
                  className="group text-teal-500 text-[14px] font-semibold inline-flex items-center gap-1"
                >
                  Contact us <AnimatedArrow size={13} />
                </Link>
              </div>
            </FadeIn>

            {otherPartners.length > 0 && (
              <FadeIn delay={0.1}>
                <div className="border-t border-gray-200 pt-5">
                  <p className="text-navy-900 text-[13px] font-semibold tracking-[0.65px] uppercase mb-4">
                    Other Partners
                  </p>
                  <div className="flex flex-col gap-3">
                    {otherPartners.map((p, i) => (
                      <FadeIn key={p.slug} delay={0.05 * (i + 1)}>
                        <Link
                          href={`/partners/${p.slug}`}
                          className="group flex items-center gap-3 p-3 border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="size-10 border border-gray-100 rounded-lg flex items-center justify-center bg-white shrink-0 overflow-hidden p-1">
                            <BrandLogoImage
                              src={p.logo.url || undefined}
                              name={p.name}
                              className="max-h-7 max-w-[52px] object-contain"
                              fallbackClassName="text-center font-bold text-[11px] leading-tight tracking-[0.02em] text-navy-900 select-none"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-navy-900 text-[14px] font-semibold leading-tight group-hover:text-teal-500 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-gray-400 text-[12px] line-clamp-1">{p.description}</p>
                          </div>
                        </Link>
                      </FadeIn>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
          </aside>

        </div>
      </div>

      <WholesalePricing />
    </main>
  )
}
