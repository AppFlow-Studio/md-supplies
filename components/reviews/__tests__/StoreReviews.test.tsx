import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StoreReviews } from '../StoreReviews'
import type { StoreReview } from '@/lib/trustshop/types'

afterEach(cleanup)

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const summary = {
  averageRating: 4.6,
  totalReviews: 2,
  ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
}

function makeReview(overrides: Partial<StoreReview> = {}): StoreReview {
  return {
    id: 's1',
    starRating: 5,
    title: 'Great',
    content: 'Great service',
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

const baseProps = {
  basePath: '/reviews',
  currentFilter: 'all' as const,
  currentSort: 'most_helpful' as const,
  currentPage: 1,
  hasNextPage: false,
  media: [],
}

describe('StoreReviews', () => {
  it('shows a clean "No customer reviews yet" state, never a fake rating, when summary is null', () => {
    render(<StoreReviews {...baseProps} summary={null} reviews={[]} />)
    expect(screen.getByText('No customer reviews yet.')).toBeInTheDocument()
  })

  it('shows a provider-failure alert when reviews is null (distinct from a genuine empty list)', () => {
    render(<StoreReviews {...baseProps} summary={summary} reviews={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/i)
  })

  it('renders review cards for a real result set', () => {
    render(<StoreReviews {...baseProps} summary={summary} reviews={[makeReview({ id: 'a' }), makeReview({ id: 'b' })]} />)
    expect(screen.getByRole('list', { name: 'Customer store reviews' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows a Load More link only when hasNextPage is true', () => {
    const { rerender } = render(<StoreReviews {...baseProps} summary={summary} reviews={[makeReview()]} hasNextPage={false} />)
    expect(screen.queryByRole('link', { name: 'Load More' })).not.toBeInTheDocument()

    rerender(<StoreReviews {...baseProps} summary={summary} reviews={[makeReview()]} hasNextPage />)
    expect(screen.getByRole('link', { name: 'Load More' })).toBeInTheDocument()
  })

  it('always renders the Write a Store Review CTA and write-form heading', () => {
    render(<StoreReviews {...baseProps} summary={null} reviews={[]} />)
    expect(screen.getByRole('link', { name: 'Write a Store Review' })).toHaveAttribute('href', '#write-a-store-review')
    expect(screen.getByRole('heading', { name: 'Share Your Experience' })).toBeInTheDocument()
  })
})
