'use client'

import { useState, useTransition } from 'react'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { useCart } from '@/components/store/CartProvider'
import { resolvePurchasable, purchasabilityCta } from '@/lib/purchasability'

interface Props {
  variantId: string | null
  quantity: number
  availableForSale: boolean
  /** Selected variant price in major units. <= 0 blocks purchase (Phase 11). */
  price?: number | null
}

export function AddToCartButton({ variantId, quantity, availableForSale, price }: Props) {
  const { addItem } = useCart()
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  // Fail-closed: a zero/missing price is never purchasable, and it reads
  // "Request pricing" rather than the misleading "Out of Stock" — the catalog
  // has 41 active zero-price variants, several titled "… Order For Pricing".
  const state = resolvePurchasable({ price, availableForSale })
  const blocked = !state.purchasable

  const handleClick = () => {
    if (!variantId || blocked || isPending) return

    startTransition(async () => {
      // Only celebrate when Shopify actually added the line — this previously
      // showed "Added!" even when the line was silently dropped (Phase 11).
      const ok = await addItem(variantId, quantity)
      if (!ok) return
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    })
  }

  const label = blocked
    ? purchasabilityCta(state.reason)
    : isPending
    ? 'Adding…'
    : added
    ? 'Added!'
    : 'Add to Cart'

  return (
    <button
      onClick={handleClick}
      disabled={!variantId || blocked || isPending}
      className="flex-1 bg-navy-900 text-white h-[56px] flex items-center justify-center gap-2 text-[15px] font-semibold tracking-[0.3px] uppercase hover:bg-navy-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <ShoppingCart size={16} />
      )}
      {label}
    </button>
  )
}
