import Link from 'next/link'
import type { Partner } from '@/types/partner'
import { FeaturedProductCard } from './FeaturedProductCard'
import { WebPageSchema } from '@/components/schema/WebPageSchema'
import { BreadcrumbSchema } from '@/components/schema/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/constants'
import { BrandLogoImage } from '@/components/shared/BrandLogoImage'

interface Props {
  partner: Partner
}

export function PartnerDetail({ partner }: Props) {
  const pageUrl = `${SITE_URL}/partners/${partner.slug}`
  const pageDescription = partner.seoDescription || partner.description

  return (
    <main id="main-content" className="bg-[#f9fafc]">
      <WebPageSchema
        name={partner.seoTitle || partner.name}
        description={pageDescription}
        url={pageUrl}
      />
      <BreadcrumbSchema
        items={[
          { label: 'Partners', href: '/partners' },
          { label: partner.name },
        ]}
        currentUrl={pageUrl}
      />

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 text-[15px] tracking-[0.3px]">
            <li><Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">Home</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li><Link href="/partners" className="text-gray-500 hover:text-navy-900 transition-colors">Partners</Link></li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">{partner.name}</li>
          </ol>
        </nav>

        {/* Header: logo + name + type badge + intro */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-12">
          <div className="flex items-center justify-center bg-white border border-gray-200 rounded-xl p-6 sm:w-48 shrink-0">
            <BrandLogoImage
              src={partner.logo.url || undefined}
              name={partner.name}
              width={partner.logo.width}
              height={partner.logo.height}
              className="max-h-16 w-auto object-contain"
              fallbackClassName="text-center font-bold text-[20px] tracking-[0.04em] text-navy-900 select-none"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-navy-900">{partner.name}</h1>
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.3px] px-3 py-1 rounded-full ${
                  partner.type === 'brand'
                    ? 'bg-teal-500/10 text-teal-500 border border-teal-500/20'
                    : 'bg-navy-900/10 text-navy-900 border border-navy-900/20'
                }`}
              >
                {partner.type === 'brand' ? 'Brand' : 'Vendor / Distributor'}
              </span>
            </div>
            <p className="text-base text-gray-500 leading-relaxed max-w-[640px]">{partner.intro}</p>
          </div>
        </div>

        {/* Featured products */}
        {partner.featuredProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Featured Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {partner.featuredProducts.map((p) => (
                <FeaturedProductCard key={p.handle} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Related categories */}
        {partner.relatedCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Product Categories</h2>
            <div className="flex flex-wrap gap-2">
              {partner.relatedCategories.map((cat) => (
                <a
                  key={cat.handle}
                  href={`/category/${cat.handle}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Related brands — vendor pages only */}
        {partner.type === 'vendor' && partner.relatedBrands && partner.relatedBrands.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy-900 mb-4">Related Brands</h2>
            <div className="flex flex-wrap gap-2">
              {partner.relatedBrands.map((slug) => (
                <a
                  key={slug}
                  href={`/partners/${slug}`}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-navy-900 hover:border-teal-500 hover:text-teal-500 transition-colors capitalize"
                >
                  {slug.replace(/-/g, ' ')}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
