'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import type { ProductReviewMedia as MediaItem } from '@/lib/trustshop/types'
import { ReviewMediaModal } from './ReviewMediaModal'

/**
 * Customer photo/video strip — only rendered by callers when media exists.
 * Fixed-square thumbnails (no CLS risk regardless of image load timing);
 * the lightbox reserves the real aspect ratio for the enlarged view. Plain
 * <img>, not next/image — see the note in ReviewMediaModal.tsx.
 */
export function ProductReviewMedia({ media }: { media: MediaItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (media.length === 0) return null

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="group" aria-label="Customer photos and videos">
        {media.map((item, i) => (
          <button
            key={`${item.reviewId}-${i}`}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative shrink-0 size-[72px] bg-neutral-50 overflow-hidden border border-gray-200 hover:border-navy-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
            aria-label={item.mediaType === 'video' ? 'Play customer video' : 'View customer photo'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            {item.mediaType === 'video' && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30" aria-hidden="true">
                <Play size={20} className="text-white" fill="white" />
              </span>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <ReviewMediaModal media={media} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  )
}
