import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SearchFilters } from '../SearchFilters'
import type { CollectionFilter } from '@/lib/shopify/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const priceFilter: CollectionFilter = {
  id: 'filter.v.price',
  label: 'Price',
  type: 'PRICE_RANGE',
  values: [{ id: 'price', label: 'Price', count: 12, input: '{"price":{"min":0,"max":150}}' }],
}

describe('SearchFilters price range', () => {
  it('uses the real price bounds from the filter data, not a hardcoded ceiling', () => {
    render(<SearchFilters filters={[priceFilter]} activeFilters={[]} currentSort={undefined} q="gloves" />)

    const slider = screen.getByLabelText('Maximum price') as HTMLInputElement
    expect(slider.min).toBe('0')
    expect(slider.max).toBe('150')
  })

  it('shows the real max as the display label when no price filter is active', () => {
    render(<SearchFilters filters={[priceFilter]} activeFilters={[]} currentSort={undefined} q="gloves" />)

    expect(screen.getByText('$150.00+')).toBeInTheDocument()
  })
})
