'use client'

import { useState, useRef } from 'react'
import type { ProductCardData } from '@/types/product'
import { QuickAddModal } from './QuickAddModal'

interface Props {
  product: ProductCardData
}

export function ProductCardClient({ product }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function handleOpen() {
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        disabled={!product.available}
        aria-label={`Quick add ${product.title}`}
        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
          product.available
            ? 'bg-navy-900 text-white hover:bg-navy-950'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {product.available ? 'Quick Add' : 'Out of Stock'}
      </button>

      {isOpen && <QuickAddModal product={product} onClose={handleClose} />}
    </>
  )
}
