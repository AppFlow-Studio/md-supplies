import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProductRating } from '../ProductRating'
import { ProductReviewSummaryLink } from '../ProductReviewSummaryLink'

afterEach(cleanup)

const summary = {
  averageRating: 4.8,
  totalReviews: 47,
  ratingsDistribution: { 1: 0, 2: 0, 3: 1, 4: 8, 5: 38 },
}

describe('ProductRating', () => {
  it('renders an accessible label with the rounded average and count', () => {
    render(<ProductRating summary={summary} />)
    expect(screen.getByRole('img', { name: 'Rated 4.8 out of 5 based on 47 reviews' })).toBeInTheDocument()
  })

  it('uses singular "review" for exactly one review', () => {
    render(<ProductRating summary={{ ...summary, totalReviews: 1 }} />)
    expect(screen.getByRole('img', { name: /based on 1 review$/ })).toBeInTheDocument()
  })

  it('renders "(N)" for the card variant', () => {
    render(<ProductRating summary={summary} variant="card" />)
    expect(screen.getByText('(47)')).toBeInTheDocument()
  })

  it('renders "· N Reviews" for the compact variant', () => {
    render(<ProductRating summary={summary} variant="compact" />)
    expect(screen.getByText('· 47 Reviews')).toBeInTheDocument()
  })

  it('renders nothing for a null summary', () => {
    const { container } = render(<ProductRating summary={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a zero-review summary — never a fake 0.0', () => {
    const { container } = render(
      <ProductRating summary={{ averageRating: 0, totalReviews: 0, ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ProductReviewSummaryLink', () => {
  it('links to #reviews and shows the rating for a reviewed product', () => {
    render(<ProductReviewSummaryLink summary={summary} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '#reviews')
    expect(screen.getByText('· 47 Reviews')).toBeInTheDocument()
  })

  it('shows a clean "No reviews yet" state, not a fake rating, for a zero-review product', () => {
    render(<ProductReviewSummaryLink summary={null} />)
    const link = screen.getByRole('link', { name: /No reviews yet/ })
    expect(link).toHaveAttribute('href', '#reviews')
    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
  })
})
