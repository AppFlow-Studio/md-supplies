import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { SearchResultsSection } from '../SearchResultsSection'
import type { CollectionProduct, PageInfo } from '@/lib/shopify/types'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('q=gloves'),
}))

vi.mock('../../../app/search/actions', () => ({
  loadMoreSearchProducts: vi.fn().mockResolvedValue({
    products: [],
    pageInfo: { hasNextPage: false, hasPreviousPage: true, startCursor: null, endCursor: 'cursor-2' },
  }),
}))

afterEach(() => {
  cleanup()
  replace.mockClear()
})

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

const pageInfo: PageInfo = { hasNextPage: true, hasPreviousPage: false, startCursor: null, endCursor: 'cursor-1' }

describe('SearchResultsSection Load More URL reflection (NF13)', () => {
  it('reflects the new cursor in the URL via router.replace after loading more', async () => {
    render(
      <SearchResultsSection
        initialProducts={[product]}
        initialPageInfo={pageInfo}
        q="gloves"
        sortKey="RELEVANCE"
        reverse={false}
        filters={[]}
        clearFiltersUrl="/search?q=gloves"
        isFiltered={false}
      />,
    )

    fireEvent.click(screen.getByText('Load More'))

    await waitFor(() => expect(replace).toHaveBeenCalled())
    const [url] = replace.mock.calls[0]
    expect(url).toContain('after=cursor-2')
    expect(url).toContain('q=gloves')
  })
})
