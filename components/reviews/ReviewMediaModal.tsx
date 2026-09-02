'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ProductReviewMedia as MediaItem } from '@/lib/trustshop/types'

interface Props {
  media: MediaItem[]
  startIndex: number
  onClose: () => void
}

// Focus-trap/Escape/restore-focus pattern copied from
// components/product/QuickAddModal.tsx (this codebase's one existing
// dialog), extended with left/right keyboard navigation between media items.
export function ReviewMediaModal({ media, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex)
  const modalRef = useRef<HTMLDivElement>(null)
  const item = media[index]

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowLeft') { setIndex((i) => (i - 1 + media.length) % media.length); return }
      if (e.key === 'ArrowRight') { setIndex((i) => (i + 1) % media.length); return }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose, media.length])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customer review media"
        className="relative z-10 w-[95vw] max-w-[720px] max-h-[90vh] flex flex-col items-center gap-4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-10 right-0 z-20 size-[36px] flex items-center justify-center text-white hover:text-gray-300 transition-colors"
        >
          <X size={22} />
        </button>

        <div
          className="relative w-full bg-black flex items-center justify-center"
          style={{
            aspectRatio: item.width && item.height ? `${item.width} / ${item.height}` : '4 / 3',
            maxHeight: '75vh',
          }}
        >
          {item.mediaType === 'video' ? (
            <video src={item.url} controls preload="none" className="max-w-full max-h-full" />
          ) : (
            // Plain <img>, not next/image: TrustShop's real media CDN host is
            // unknown until a live key/fixture is available to add to
            // next.config.ts's images.remotePatterns (see TODO there). Aspect
            // ratio is still reserved via the wrapping div's inline style
            // above, so this doesn't reintroduce CLS.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
          )}

          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
                aria-label="Previous media"
                className="absolute left-2 top-1/2 -translate-y-1/2 size-[40px] flex items-center justify-center bg-white/90 hover:bg-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % media.length)}
                aria-label="Next media"
                className="absolute right-2 top-1/2 -translate-y-1/2 size-[40px] flex items-center justify-center bg-white/90 hover:bg-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {item.reviewId && (
          <Link
            href={`#review-${item.reviewId}`}
            onClick={onClose}
            className="text-white text-[13px] underline underline-offset-2 hover:text-gray-300"
          >
            See this review
          </Link>
        )}
      </div>
    </div>
  )
}
