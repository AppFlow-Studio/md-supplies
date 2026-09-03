import Link from 'next/link'
import type { CollectionProduct } from '@/lib/shopify/types'
import { ShopifyProductCard } from '@/components/store/ShopifyProductCard'
import { ViewItemListTracker } from './ViewItemListTracker'
import type { ProductReviewSummary } from '@/lib/trustshop/types'

interface Props {
    products: CollectionProduct[]
    emptyStateHref: string
    emptyStateMessage?: string
    categorySlug?: string
    itemListId: string
    itemListName: string
    /** Keyed by Shopify GID (product.id) — batch-fetched with a bounded
        concurrency cap (getManyProductReviewSummaries) so a full collection
        page never issues a sequential per-card TrustShop waterfall. */
    reviewSummaries?: Map<string, ProductReviewSummary | null>
    /** Favorites (DEV-FAV-01). Omitted (default) leaves the heart unrendered
        on a grid that hasn't been wired up — see ShopifyProductCard's own
        prop comment. When passed, `isSignedIn` must be the real
        server-computed session state for this request, and
        `favoritedProductIds` ONE batched read of the customer's saved IDs
        (never a per-card fetch — see CategoryResults/SearchResultsSection). */
    isSignedIn?: boolean
    favoritedProductIds?: ReadonlySet<string>
    onFavoriteRemoved?: (productId: string) => void
}

export function ProductGrid({
    products,
    emptyStateHref,
    emptyStateMessage = 'No products found.',
    categorySlug,
    itemListId,
    itemListName,
    reviewSummaries,
    isSignedIn,
    favoritedProductIds,
    onFavoriteRemoved,
}: Props) {

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-navy-900 text-[20px] font-semibold">
          {emptyStateMessage}
        </p>
        <p className="text-gray-500 text-[15px]">
          Try adjusting or clearing your filters.
        </p>
        <Link
          href={emptyStateHref}
          className="mt-2 border border-navy-900 text-navy-900 text-[15px] font-semibold px-6 h-[44px] flex items-center hover:bg-neutral-50 transition-colors"
        >
          Clear all filters
        </Link>
      </div>
    )
  }

  return (
    // Two cards per row on phones (spec §"Mobile collection shopping
    // experience"). This was grid-cols-1, which meant one full-width card per
    // screen and a great deal of scrolling to see a 20-product page. The gutter
    // tightens to 12px below sm so two cards fit at 320px without the card
    // content being squeezed; it returns to the established 23px from sm up.
    <div data-testid="product-grid" className="grid grid-cols-2 gap-3 sm:gap-[23px] xl:grid-cols-3">
      <ViewItemListTracker products={products} itemListId={itemListId} itemListName={itemListName} />
      {products.map((product, index) => (
        <ShopifyProductCard
          key={product.id}
          product={product}
          categorySlug={categorySlug}
          itemListId={itemListId}
          itemListName={itemListName}
          index={index}
          // First xl row (3 tiles) is above the fold — eager + fetchpriority
          // high so the category LCP image isn't lazy-loaded.
          imagePriority={index < 3}
          reviewSummary={reviewSummaries?.get(product.id) ?? null}
          isSignedIn={isSignedIn}
          isFavorited={favoritedProductIds?.has(product.id) ?? false}
          onFavoriteRemoved={onFavoriteRemoved}
        />
      ))}
    </div>
  )
}
