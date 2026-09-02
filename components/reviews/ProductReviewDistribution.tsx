import type { ProductReviewSummary } from '@/lib/trustshop/types'

interface Props {
  distribution: ProductReviewSummary['ratingsDistribution']
  total: number
}

export function ProductReviewDistribution({ distribution, total }: Props) {
  if (total === 0) return null

  return (
    <div className="flex flex-col gap-2 w-full max-w-[360px]">
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const count = distribution[star]
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={star} className="flex items-center gap-3 text-[13px] text-gray-500">
            <span className="w-[46px] shrink-0">{star} star</span>
            <div className="flex-1 h-2 bg-gray-100 overflow-hidden" aria-hidden="true">
              <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-[28px] shrink-0 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
