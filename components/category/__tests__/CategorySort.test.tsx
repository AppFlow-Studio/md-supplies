import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CategorySort } from '../CategorySort'

const push = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/category/gloves',
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

describe('CategorySort tracking-param preservation', () => {
  it('carries utm and ad click-id params through a sort change', () => {
    currentSearch = 'utm_source=chatgpt.com&utm_medium=referral&msclkid=abc123'
    render(<CategorySort activeFilters={[]} />)

    selectSort('Price: Low to High')

    expect(push).toHaveBeenCalledTimes(1)
    const url = push.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('sort')).toBe('PRICE_ASC')
    expect(params.get('utm_source')).toBe('chatgpt.com')
    expect(params.get('utm_medium')).toBe('referral')
    expect(params.get('msclkid')).toBe('abc123')
  })

  it('keeps active filters alongside tracking params', () => {
    currentSearch = 'utm_source=bing'
    render(<CategorySort activeFilters={['{"v":"latex"}']} />)

    selectSort('Newest')

    const params = new URLSearchParams((push.mock.calls[0][0] as string).split('?')[1])
    expect(params.get('sort')).toBe('CREATED')
    expect(params.getAll('filter')).toEqual(['{"v":"latex"}'])
    expect(params.get('utm_source')).toBe('bing')
  })

  it('does not carry non-tracking navigation params (page/after)', () => {
    currentSearch = 'utm_source=bing&page=3&after=cursorXYZ'
    render(<CategorySort activeFilters={[]} />)

    selectSort('Price: High to Low')

    const url = push.mock.calls[0][0] as string
    expect(url).toContain('utm_source=bing')
    expect(url).not.toContain('page=3')
    expect(url).not.toContain('after=')
  })
})

describe('CategorySort limitedSortOptions', () => {
  it('renders all 5 options when limitedSortOptions is unset (no regression)', () => {
    render(<CategorySort activeFilters={[]} />)

    fireEvent.click(screen.getByText('SORT BY:'))

    expect(screen.getAllByText('Featured').length).toBeGreaterThan(0)
    expect(screen.getByText('Best Selling')).toBeInTheDocument()
    expect(screen.getByText('Price: Low to High')).toBeInTheDocument()
    expect(screen.getByText('Price: High to Low')).toBeInTheDocument()
    expect(screen.getByText('Newest')).toBeInTheDocument()
  })

  it('renders only Featured/Price options when limitedSortOptions is true', () => {
    render(<CategorySort activeFilters={[]} limitedSortOptions />)

    fireEvent.click(screen.getByText('SORT BY:'))

    expect(screen.getAllByText('Featured').length).toBeGreaterThan(0)
    expect(screen.getByText('Price: Low to High')).toBeInTheDocument()
    expect(screen.getByText('Price: High to Low')).toBeInTheDocument()
    expect(screen.queryByText('Best Selling')).toBeNull()
    expect(screen.queryByText('Newest')).toBeNull()
  })

  it('falls back to Featured as selected when currentSort is a hidden option under limitedSortOptions', () => {
    render(<CategorySort activeFilters={[]} currentSort="BEST_SELLING" limitedSortOptions />)

    // "Featured" should appear as the selected label next to "SORT BY:",
    // not "Best Selling" (which is hidden and shouldn't render at all).
    expect(screen.getByText('Featured')).toBeInTheDocument()
    expect(screen.queryByText('Best Selling')).toBeNull()
  })
})
