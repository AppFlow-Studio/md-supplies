'use client'

import { useEffect } from 'react'
import type { CollectionProduct } from '@/lib/shopify/types'
import { track } from '@/lib/analytics/track'
import { buildViewItemListEvent, toGA4Item, currencyOf } from '@/lib/analytics/events'

interface Props {
  products: CollectionProduct[]
  itemListId: string
  itemListName: string
}

export function ViewItemListTracker({ products, itemListId, itemListName }: Props) {
  const idsKey = products.map((p) => p.id).join(',')

  useEffect(() => {
    if (products.length === 0) return
    track({
      ...buildViewItemListEvent({
        currency: currencyOf(products[0]),
        itemListId,
        itemListName,
        items: products.map(toGA4Item),
      }),
    })
    // idsKey, not `products` (a new array reference every render), is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, itemListId, itemListName])

  return null
}
