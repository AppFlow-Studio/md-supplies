import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StoreReviewCard } from '../StoreReviewCard'
import type { StoreReview } from '@/lib/trustshop/types'

afterEach(cleanup)

function makeReview(overrides: Partial<StoreReview> = {}): StoreReview {
  return {
    id: 's1',
    starRating: 5,
    title: 'Smooth ordering',
    content: 'Fast shipping and great support.',
    createdAt: '2026-02-01T00:00:00Z',
    countryCode: 'US',
    buyerVerified: false,
    helpfulCount: 0,
    customerName: 'Alex',
    reply: null,
    replyDate: null,
    media: [],
    languageCode: 'en',
    ...overrides,
  }
}

describe('StoreReviewCard', () => {
  it('shows the Verified Customer badge only when buyerVerified is true', () => {
    render(<StoreReviewCard review={makeReview({ buyerVerified: true })} />)
    expect(screen.getByText('Verified Customer')).toBeInTheDocument()
  })

  it('shows no Verified Customer badge when buyerVerified is false', () => {
    render(<StoreReviewCard review={makeReview({ buyerVerified: false })} />)
    expect(screen.queryByText('Verified Customer')).not.toBeInTheDocument()
  })

  it('renders a merchant reply and its date when present', () => {
    render(<StoreReviewCard review={makeReview({ reply: 'Thanks for shopping with us!', replyDate: '2026-02-02T00:00:00Z' })} />)
    expect(screen.getByText(/Thanks for shopping with us!/)).toBeInTheDocument()
    expect(screen.getByText(/Response from MD Supplies/)).toBeInTheDocument()
  })

  it('renders no reply block when reply is absent', () => {
    render(<StoreReviewCard review={makeReview({ reply: null })} />)
    expect(screen.queryByText(/Response from MD Supplies/)).not.toBeInTheDocument()
  })

  it('renders the helpful count as plain text, never a clickable button', () => {
    render(<StoreReviewCard review={makeReview({ helpfulCount: 2 })} />)
    expect(screen.getByText('2 people found this helpful')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /helpful/i })).not.toBeInTheDocument()
  })

  it('anchors the card at #store-review-<id>, distinct from a product review anchor', () => {
    const { container } = render(<StoreReviewCard review={makeReview({ id: 'xyz' })} />)
    expect(container.querySelector('#store-review-xyz')).toBeInTheDocument()
  })
})
