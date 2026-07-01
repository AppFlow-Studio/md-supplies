import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SearchSort } from '../SearchSort'

const push = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  currentSearch = ''
})

function selectSort(label: string) {
  fireEvent.click(screen.getByText('SORT BY:'))
  fireEvent.click(screen.getByText(label))
}

describe('SearchSort tracking-param preservation', () => {
  it('carries the query, sort, and tracking params through a sort change', () => {
    currentSearch = 'q=gloves&utm_source=chatgpt.com&msclkid=abc123'
    render(<SearchSort q="gloves" activeFilters={[]} />)

    selectSort('Price: Low to High')

    expect(push).toHaveBeenCalledTimes(1)
    const params = new URLSearchParams((push.mock.calls[0][0] as string).split('?')[1])
    expect(params.get('q')).toBe('gloves')
    expect(params.get('sort')).toBe('PRICE_ASC')
    expect(params.get('utm_source')).toBe('chatgpt.com')
    expect(params.get('msclkid')).toBe('abc123')
  })

  it('preserves tracking params even when returning to RELEVANCE (no sort param)', () => {
    currentSearch = 'q=masks&utm_source=bing&utm_campaign=spring'
    render(<SearchSort q="masks" currentSort="PRICE_ASC" activeFilters={[]} />)

    selectSort('Relevance')

    const params = new URLSearchParams((push.mock.calls[0][0] as string).split('?')[1])
    expect(params.has('sort')).toBe(false)
    expect(params.get('q')).toBe('masks')
    expect(params.get('utm_source')).toBe('bing')
    expect(params.get('utm_campaign')).toBe('spring')
  })
})
