'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useCart } from './CartProvider'

export function CartToast() {
  const { lastError, clearError } = useCart()

  useEffect(() => {
    if (!lastError) return
    const id = setTimeout(clearError, 5000)
    return () => clearTimeout(id)
  }, [lastError, clearError])

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-red-600 text-white px-4 py-3 shadow-lg max-w-sm transition-opacity duration-200 ${
        lastError ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <span className="text-[14px] flex-1">{lastError}</span>
      <button
        type="button"
        onClick={clearError}
        className="shrink-0 hover:opacity-80 transition-opacity"
        aria-label="Dismiss error"
      >
        <X size={16} />
      </button>
    </div>
  )
}
