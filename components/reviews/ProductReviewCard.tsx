import { ShieldCheck } from 'lucide-react'
import { Stars } from './ProductRating'
import { ProductReviewMedia } from './ProductReviewMedia'
import type { ProductReview } from '@/lib/trustshop/types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ProductReviewCard({ review }: { review: ProductReview }) {
  return (
    <article id={`review-${review.id}`} className="flex flex-col gap-3 py-6 border-b border-gray-200 scroll-mt-[140px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span role="img" aria-label={`Rated ${review.starRating} out of 5`}>
            <Stars rating={review.starRating} size="sm" />
          </span>
          {/* Verified Buyer badge strictly gated on buyerVerified === true —
              never inferred, never assumed. TrustShop owns this signal. */}
          {review.buyerVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006e46] bg-teal-50 px-2 py-0.5">
              <ShieldCheck size={12} /> Verified Buyer
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
        {/* Passive count only — TrustShop documents no write endpoint for
            helpful votes, so this is never rendered as a clickable button. */}
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
