'use client'

import { useEffect, useRef } from 'react'
import type { ProductCardData } from '@/types/product'
import { QuickAddContent } from './QuickAddContent'

interface Props {
  product: ProductCardData
  onClose: () => void
}

export function QuickAddModal({ product, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = `quick-add-title-${product.handle}`

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Blurred overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-[95vw] max-w-[920px] max-h-[90vh] bg-white shadow-2xl overflow-hidden"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick add"
          className="absolute top-3 right-3 z-20 w-[30px] h-[30px] flex items-center justify-center text-[#666664] hover:text-[#0b172b] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-col sm:flex-row max-h-[90vh] overflow-hidden">
          <QuickAddContent product={product} titleId={titleId} />
        </div>
      </div>
    </div>
  )
}
