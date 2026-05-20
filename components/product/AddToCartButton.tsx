'use client'

import { useState, useTransition } from 'react'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { useCart } from '@/components/store/CartProvider'

interface Props {
  variantId: string | null
  quantity: number
  availableForSale: boolean
}

export function AddToCartButton({ variantId, quantity, availableForSale }: Props) {
  const { addItem } = useCart()
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  const handleClick = () => {
    if (!variantId || !availableForSale || isPending) return

    startTransition(async () => {
      await addItem(variantId, quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    })
  }

  const label = !availableForSale
    ? 'Out of Stock'
    : isPending
    ? 'Adding…'
    : added
    ? 'Added!'
    : 'Add to Cart'

  return (
    <button
      onClick={handleClick}
      disabled={!variantId || !availableForSale || isPending}
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
