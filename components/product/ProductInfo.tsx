import Link from 'next/link'
import type { Product, ProductVariant } from '@/types/product'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface Props {
  product: Pick<
    Product,
    | 'brand'
    | 'vendor'
    | 'partnerVendor'
    | 'sku'
    | 'price'
    | 'compareAtPrice'
    | 'unitPriceEach'
    | 'unitPriceBox'
    | 'unitPriceCase'
    | 'sellingUnit'
  >
  selectedVariant: ProductVariant | null
}

export function ProductInfo({ product, selectedVariant }: Props) {
  const displayPrice = selectedVariant?.price ?? product.price
  const displaySku = selectedVariant?.sku ?? product.sku

  return (
    <div className="flex flex-col gap-5">
      {/* Brand / Vendor / Partner */}
      <dl className="flex flex-col gap-1 text-sm">
        {product.brand && (
          <div className="flex gap-2">
            <dt className="font-medium text-navy-900 w-20 shrink-0">Brand</dt>
            <dd className="text-gray-500">{product.brand}</dd>
          </div>
        )}
        {product.vendor && (
          <div className="flex gap-2">
            <dt className="font-medium text-navy-900 w-20 shrink-0">Vendor</dt>
            <dd className="text-gray-500">{product.vendor}</dd>
          </div>
        )}
        {product.partnerVendor && (
          <div className="flex gap-2">
            <dt className="font-medium text-navy-900 w-20 shrink-0">Partner</dt>
            <dd>
              <Link
                href={`/partners/${product.partnerVendor.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-teal-500 hover:underline"
              >
                {product.partnerVendor}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      {/* SKU */}
      <p className="text-xs text-gray-500">
        Item #: <span className="font-mono text-navy-900">{displaySku}</span>
      </p>

      {/* Price */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-navy-900">{formatCents(displayPrice)}</span>
          {product.compareAtPrice && product.compareAtPrice > displayPrice && (
            <span className="text-sm text-gray-500 line-through">
              {formatCents(product.compareAtPrice)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          per {product.sellingUnit || 'unit'}
        </p>
      </div>

      {/* Per-unit breakdown */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 border-t border-gray-200 pt-3">
        {product.unitPriceEach > 0 && (
          <span>
            <span className="font-medium text-navy-900">{formatCents(product.unitPriceEach)}</span> / each
          </span>
        )}
        {product.unitPriceBox > 0 && (
          <span>
            <span className="font-medium text-navy-900">{formatCents(product.unitPriceBox)}</span> / box
          </span>
        )}
        {product.unitPriceCase > 0 && (
          <span>
            <span className="font-medium text-navy-900">{formatCents(product.unitPriceCase)}</span> / case
          </span>
        )}
      </div>
    </div>
  )
}
