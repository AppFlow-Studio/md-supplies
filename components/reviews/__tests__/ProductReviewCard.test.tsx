import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProductReviewCard } from '../ProductReviewCard'
import type { ProductReview } from '@/lib/trustshop/types'

afterEach(cleanup)

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 'r1',
    starRating: 5,
    title: 'Great product',
    content: 'Worked exactly as described.',
    createdAt: '2026-01-15T00:00:00Z',
    countryCode: 'US',
    buyerVerified: false,
    helpfulCount: 0,
    customerName: 'Jane',
    reply: null,
    replyDate: null,
    media: [],
    languageCode: 'en',
    ...overrides,
  }
}

describe('ProductReviewCard', () => {
  it('shows the Verified Buyer badge only when buyerVerified is true', () => {
    render(<ProductReviewCard review={makeReview({ buyerVerified: true })} />)
    expect(screen.getByText('Verified Buyer')).toBeInTheDocument()
  })

  it('shows no Verified Buyer badge when buyerVerified is false', () => {
    render(<ProductReviewCard review={makeReview({ buyerVerified: false })} />)
    expect(screen.queryByText('Verified Buyer')).not.toBeInTheDocument()
  })

  it('renders a merchant reply and its date when present', () => {
    render(<ProductReviewCard review={makeReview({ reply: 'Thanks for the feedback!', replyDate: '2026-01-16T00:00:00Z' })} />)
    expect(screen.getByText(/Thanks for the feedback!/)).toBeInTheDocument()
    expect(screen.getByText(/Response from MD Supplies/)).toBeInTheDocument()
  })

  it('renders no reply block when reply is absent', () => {
    render(<ProductReviewCard review={makeReview({ reply: null })} />)
    expect(screen.queryByText(/Response from MD Supplies/)).not.toBeInTheDocument()
  })

  it('renders the helpful count as plain text, never a clickable button', () => {
    render(<ProductReviewCard review={makeReview({ helpfulCount: 3 })} />)
    expect(screen.getByText('3 people found this helpful')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /helpful/i })).not.toBeInTheDocument()
  })

  it('omits the helpful line entirely when the count is zero', () => {
    render(<ProductReviewCard review={makeReview({ helpfulCount: 0 })} />)
    expect(screen.queryByText(/found this helpful/)).not.toBeInTheDocument()
  })

  it('anchors the card at #review-<id> for the media-lightbox "see this review" link', () => {
    const { container } = render(<ProductReviewCard review={makeReview({ id: 'abc123' })} />)
    expect(container.querySelector('#review-abc123')).toBeInTheDocument()
  })
})
