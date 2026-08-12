import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CategoryFilters } from '../CategoryFilters'
import type { CollectionFilter } from '@/lib/shopify/types'

// DEF-07 / QA-038 regression: applying a filter on a category page while a
// collection-scoped search (DEV-SEARCH-01, ?q=) is active used to drop the
// query entirely — CategoryFilters' buildUrl only ever carried `sort` and
// `filter`. This locks in that ?q= now survives a filter toggle.

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (url: string) => pushMock(url) }),
  usePathname: () => '/category/gloves',
  useSearchParams: () => new URLSearchParams(),
}))

function facet(id: string, label: string, values: { label: string; input: string }[]): CollectionFilter {
  return {
    id,
    label,
    type: 'LIST',
    values: values.map((v, i) => ({ id: `${id}.${i}`, label: v.label, count: 5, input: v.input })),
  } as CollectionFilter
}

const BRAND_FACET = facet('filter.p.m.custom.brand_name', 'Brand', [
  { label: 'Dynarex', input: '{"productMetafield":{"namespace":"custom","key":"brand_name","value":"Dynarex"}}' },
])

afterEach(cleanup)
beforeEach(() => pushMock.mockClear())

describe('CategoryFilters — search query preservation (DEF-07/QA-038)', () => {
  it('keeps ?q= when a filter is toggled on', () => {
    render(<CategoryFilters filters={[BRAND_FACET]} activeFilters={[]} q="rollator" />)

    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('checkbox'))

    expect(pushMock).toHaveBeenCalledTimes(1)
    const url = pushMock.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('q')).toBe('rollator')
    expect(params.getAll('filter')).toHaveLength(1)
  })

  it('does not add ?q= when there is no active search query', () => {
    render(<CategoryFilters filters={[BRAND_FACET]} activeFilters={[]} />)

    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('checkbox'))

    const url = pushMock.mock.calls[0][0] as string
    expect(url).not.toContain('q=')
  })
})
