import type { Metadata } from 'next'
import Link from 'next/link'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCTS } from '@/lib/shopify/queries/products'
import { slugifyVendor } from '@/lib/brands'
import { WholesalePricing } from '@/components/home/WholesalePricing'
import type { CollectionProduct } from '@/lib/shopify/types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Shop by Brand | MD Supplies',
  description: 'Browse all medical supply brands available at wholesale prices.',
}

export default async function BrandsPage() {
  const data = await storefrontFetch<{ products: { nodes: CollectionProduct[] } }>(
    GET_PRODUCTS,
    { first: 250 },
  )

  const vendorMap = new Map<string, number>()
  for (const p of data.products.nodes) {
    if (p.vendor) vendorMap.set(p.vendor, (vendorMap.get(p.vendor) ?? 0) + 1)
  }

  const brands = Array.from(vendorMap.entries())
    .map(([vendor, count]) => ({ vendor, count, slug: slugifyVendor(vendor) }))
    .sort((a, b) => a.vendor.localeCompare(b.vendor))

  return (
    <main>
      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pt-16 md:pt-20 pb-12 md:pb-16">
          <p className="text-teal-500 text-[13px] sm:text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
            Browse by Manufacturer
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h1 className="text-[40px] sm:text-[50px] font-semibold text-navy-900 leading-[1.1] tracking-tight">
              Shop by Brand
            </h1>
            <p className="text-gray-500 text-[15px] leading-[1.65] max-w-[420px]">
              {brands.length} brands available at wholesale prices.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-neutral-100">
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-20 md:pb-24">
          {brands.length === 0 ? (
            <p className="text-gray-500 text-[15px] py-12">No brands available yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {brands.map(({ vendor, count, slug }) => (
                <Link
                  key={slug}
                  href={`/brands/${slug}`}
                  className="group bg-white border border-gray-200 p-6 flex flex-col gap-3 hover:border-navy-900 transition-colors"
                >
                  <span className="text-navy-900 text-[18px] font-semibold leading-tight group-hover:text-teal-500 transition-colors">
                    {vendor}
                  </span>
                  <span className="text-gray-500 text-[13px]">
                    {count} product{count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-teal-500 text-[13px] font-semibold mt-auto">
                    View Products →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <WholesalePricing />
    </main>
  )
}
