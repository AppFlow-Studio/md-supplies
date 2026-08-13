import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SearchResultsSection } from '../SearchResultsSection'
import type { CollectionProduct } from '@/lib/shopify/types'

afterEach(cleanup)

const product: CollectionProduct = {
  id: 'gid://1',
  title: 'Gloves',
  handle: 'gloves',
  vendor: 'Acme',
  availableForSale: true,
  tags: [],
  priceRange: {
    minVariantPrice: { amount: '10', currencyCode: 'USD' },
    maxVariantPrice: { amount: '10', currencyCode: 'USD' },
  },
  images: { nodes: [] },
  variants: {
    nodes: [{
      id: 'v1',
      title: 'Default',
      price: { amount: '10', currencyCode: 'USD' },
      compareAtPrice: null,
      availableForSale: true,
      quantityAvailable: 10,
    }],
  },
}

describe('SearchResultsSection', () => {
  it('renders the products it is given (pagination lives in page.tsx, not here)', () => {
    render(
      <SearchResultsSection
        products={[product]}
        q="gloves"
        clearFiltersUrl="/search?q=gloves"
        isFiltered={false}
      />,
    )

    expect(screen.getByText('Gloves')).toBeInTheDocument()
    expect(screen.queryByText('Load More')).toBeNull()
  })

  it('shows the empty state with a clear-filters recovery link when filtered', () => {
    render(
      <SearchResultsSection
        products={[]}
        q="zzznonexistent"
        clearFiltersUrl="/search?q=zzznonexistent"
        isFiltered
      />,
    )

    expect(screen.getByText('No results for “zzznonexistent”')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
      'href',
      '/search?q=zzznonexistent',
    )
  })

  it('shows suggested categories instead of a clear-filters link when there is no active filter', () => {
    render(
      <SearchResultsSection
        products={[]}
        q="zzznonexistent"
        clearFiltersUrl="/search?q=zzznonexistent"
        isFiltered={false}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Clear filters' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Exam Gloves' })).toBeInTheDocument()
  })
})
