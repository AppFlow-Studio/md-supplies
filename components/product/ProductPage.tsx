'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { Product, ProductVariant } from '@/types/product'
import { ProductGallery } from './ProductGallery'
import { ProductInfo } from './ProductInfo'
import { ProductVariantSelector } from './ProductVariantSelector'
import { QuantityAddToCart } from './QuantityAddToCart'
import { PackagingTable } from './PackagingTable'
import { ShippingBlock } from './ShippingBlock'
import { ProductDescription } from './ProductDescription'
import { SpecsTable } from './SpecsTable'
import { ReturnPolicy } from './ReturnPolicy'
import { RelatedProducts } from './RelatedProducts'
import { RelatedCategories } from './RelatedCategories'

interface Props {
  product: Product
}

export function ProductPage({ product }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.find((v) => v.available) ?? product.variants[0] ?? null,
  )

  const handleVariantChange = useCallback((variant: ProductVariant | null) => {
    setSelectedVariant(variant)
  }, [])

  return (
    <main className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8 flex flex-col gap-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          {product.breadcrumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-gray-200">/</span>}
              {crumb.handle ? (
                <Link href={crumb.handle} className="hover:text-teal-500 transition-colors">
                  {crumb.title}
                </Link>
              ) : (
                <span>{crumb.title}</span>
              )}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-gray-200">/</span>
            <span
              aria-current="page"
              className="text-navy-900 font-medium truncate max-w-50 sm:max-w-none"
            >
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Top section: Gallery + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
        <ProductGallery images={product.images} alt={product.imageAltText} />

        <div className="flex flex-col gap-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 leading-tight">
            {product.title}
          </h1>

          <ProductInfo product={product} selectedVariant={selectedVariant} />

          <hr className="border-gray-200" />

          <ProductVariantSelector
            options={product.options}
            variants={product.variants}
            onVariantChange={handleVariantChange}
          />

          <QuantityAddToCart selectedVariant={selectedVariant} />
        </div>
      </div>

      {/* Full-width detail sections */}
      <div className="flex flex-col gap-10">
        <PackagingTable product={product} />
        <ShippingBlock product={product} />
        {product.description && <ProductDescription html={product.description} />}
        <SpecsTable product={product} />
        <ReturnPolicy product={product} />
        <RelatedProducts products={product.relatedProducts} />
        <RelatedCategories collections={product.relatedCollections} />
      </div>
    </main>
  )
}
