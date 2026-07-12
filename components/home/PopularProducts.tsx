'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { QuickAddModal } from '@/components/product/QuickAddModal'
import { ProductImage } from '@/components/shared/ProductImage'
import type { CollectionProduct } from '@/lib/shopify/types'
import type { ProductCardData } from '@/types/product'
import { cleanShopifyAlt } from '@/lib/alt-text'

interface Props {
  products: CollectionProduct[]
}

function toCardData(product: CollectionProduct): ProductCardData {
  const image = product.images.nodes[0]
  const firstVariant = product.variants.nodes[0]
  const price = Math.round(
    parseFloat(firstVariant?.price.amount ?? product.priceRange.minVariantPrice.amount) * 100,
  )
  const compareAtPrice = firstVariant?.compareAtPrice
    ? Math.round(parseFloat(firstVariant.compareAtPrice.amount) * 100)
    : undefined

  return {
    handle: product.handle,
    title: product.title,
    image: {
      url: image?.url ?? '',
      altText: cleanShopifyAlt(image?.altText) ?? product.title,
      width: image?.width ?? 800,
      height: image?.height ?? 800,
    },
    images: product.images.nodes.map((img) => ({
      url: img.url,
      altText: cleanShopifyAlt(img.altText) ?? product.title,
      width: img.width ?? 800,
      height: img.height ?? 800,
    })),
    brand: product.vendor,
    vendor: product.vendor,
    price,
    compareAtPrice,
    sku: '',
    available: product.availableForSale,
    hasFreeShipping: product.tags.includes('free-shipping'),
    isRx: product.tags.includes('rx-required'),
    variants: product.variants.nodes.map((v) => ({
      id: v.id,
      title: v.title,
      price: Math.round(parseFloat(v.price.amount) * 100),
      compareAtPrice: v.compareAtPrice
        ? Math.round(parseFloat(v.compareAtPrice.amount) * 100)
        : undefined,
      available: v.availableForSale,
    })),
  }
}

export function PopularProducts({ products }: Props) {
  const [openHandle, setOpenHandle] = useState<string | null>(null)

  const openProduct = openHandle
    ? products.find((p) => p.handle === openHandle) ?? null
    : null

  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn>
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-8">
            Popular products
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product, i) => {
            const variant = product.variants.nodes[0]
            const price = parseFloat(
              variant?.price.amount ?? product.priceRange.minVariantPrice.amount,
            )
            const image = product.images.nodes[0]

            return (
              <FadeIn key={product.id} delay={i * 0.08} className="bg-white flex flex-col">

                <Link
                  href={`/product/${product.handle}`}
                  className="group relative overflow-hidden aspect-square bg-gray-50 block"
                >
                  <ProductImage
                    src={image?.url}
                    alt={cleanShopifyAlt(image?.altText) ?? product.title}
                    className="object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                <div className="flex flex-col gap-1.5 p-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-teal-500 tracking-[0.26px]">
                      {product.vendor}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-500/60 tracking-[0.26px]">
                      {product.availableForSale ? 'in stock' : 'out of stock'}
                    </span>
                  </div>

                  <p className="text-[14px] font-semibold text-black leading-snug line-clamp-3">
                    {product.title}
                  </p>
                  <p className="text-[18px] font-bold text-black tracking-[0.36px] mt-auto pt-1">
                    ${price.toFixed(2)} USD
                  </p>

                  {product.availableForSale && (
                    <button
                      type="button"
                      onClick={() => setOpenHandle(product.handle)}
                      className="cursor-pointer mt-2 bg-navy-900 text-white text-[12px] font-semibold text-center py-2.5 flex items-center justify-center gap-1.5 hover:bg-navy-950 transition-colors"
                    >
                      <Plus size={13} />
                      Quick Add
                    </button>
                  )}
                </div>

              </FadeIn>
            )
          })}
        </div>

      </div>

      {openProduct && (
        <QuickAddModal
          product={toCardData(openProduct)}
          onClose={() => setOpenHandle(null)}
        />
      )}
    </section>
  )
}
