'use client'

import { useState } from 'react'
import { ProductGrid } from '@/components/category/ProductGrid'
import type { CollectionProduct } from '@/lib/shopify/types'

interface Props {
  products: CollectionProduct[]
}

/**
 * Thin client wrapper so removing a favorite drops its tile immediately —
 * no full-page reload and no server round trip just to re-render the list
 * (the FavoriteButton's own toggle already durably removed the record;
 * this only updates what's on screen). Every product here is favorited by
 * definition, so favoritedProductIds is simply "all of them."
 */
export function AccountFavoritesGrid({ products: initialProducts }: Props) {
  const [products, setProducts] = useState(initialProducts)

  function handleRemoved(productId: string) {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  return (
    <ProductGrid
      products={products}
      emptyStateHref="/categories"
      emptyStateMessage="No favorites yet."
      itemListId="account-favorites"
      itemListName="My Favorites"
      isSignedIn
      favoritedProductIds={new Set(products.map((p) => p.id))}
      onFavoriteRemoved={handleRemoved}
    />
  )
}
