import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProductReviewSummaryLink } from '../ProductReviewSummaryLink'

afterEach(cleanup)

describe('ProductReviewSummaryLink', () => {
  it('zero-review state links straight to the write-a-review form, not just the reviews section', () => {
    render(<ProductReviewSummaryLink summary={null} />)
    expect(screen.getByRole('link', { name: /write a review/i })).toHaveAttribute('href', '#write-a-review')
  })

  it('rated state links to the reviews section (not the form)', () => {
    render(
      <ProductReviewSummaryLink
        summary={{
          averageRating: 4.5,
          totalReviews: 55,
          ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 55 },
        }}
      />,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '#reviews')
  })
})
