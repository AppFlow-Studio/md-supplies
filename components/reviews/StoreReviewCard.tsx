import { ShieldCheck } from 'lucide-react'
import { Stars } from './ProductRating'
import { ProductReviewMedia } from './ProductReviewMedia'
import type { StoreReview } from '@/lib/trustshop/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Deliberately parallel to ProductReviewCard (same gating rules: Verified
 * Buyer strictly on buyerVerified === true, reply only when present, no
 * clickable helpful button) but a store-review context — no product title,
 * no product-scoped anchor.
 */
export function StoreReviewCard({ review }: { review: StoreReview }) {
  return (
    <article id={`store-review-${review.id}`} className="flex flex-col gap-3 py-6 border-b border-gray-200 scroll-mt-[140px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span role="img" aria-label={`Rated ${review.starRating} out of 5`}>
            <Stars rating={review.starRating} size="sm" />
          </span>
          {review.buyerVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006e46] bg-teal-50 px-2 py-0.5">
              <ShieldCheck size={12} /> Verified Customer
            </span>
          )}
        </div>
        {review.createdAt && (
          <span className="text-gray-500 text-[12px]">{formatDate(review.createdAt)}</span>
        )}
      </div>

      {review.title && <h3 className="text-navy-900 text-[15px] font-semibold">{review.title}</h3>}
      <p className="text-gray-500 text-[14px] leading-[24px] whitespace-pre-line">{review.content}</p>

      {review.media.length > 0 && <ProductReviewMedia media={review.media} />}

      <div className="flex items-center justify-between gap-3 flex-wrap text-[12px] text-gray-500">
        <span>{review.customerName}{review.countryCode ? ` · ${review.countryCode}` : ''}</span>
        {review.helpfulCount > 0 && (
          <span>{review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'people'} found this helpful</span>
        )}
      </div>

      {review.reply && (
        <div className="mt-1 bg-neutral-50 border-l-2 border-teal-500 px-4 py-3 flex flex-col gap-1">
          <p className="text-navy-900 text-[12px] font-semibold uppercase tracking-[0.24px]">
            Response from MD Supplies{review.replyDate ? ` · ${formatDate(review.replyDate)}` : ''}
          </p>
          <p className="text-gray-500 text-[14px] leading-[22px]">{review.reply}</p>
        </div>
      )}
    </article>
  )
}
