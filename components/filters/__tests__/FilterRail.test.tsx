import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FilterRail } from '../FilterRail'
import type { CollectionFilter } from '@/lib/shopify/types'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (url: string) => pushMock(url) }),
}))

function facet(id: string, label: string, values: { label: string; input: string }[]): CollectionFilter {
  return {
    id,
    label,
    type: 'LIST',
    values: values.map((v, i) => ({ id: `${id}.${i}`, label: v.label, count: 5, input: v.input })),
  } as CollectionFilter
}

function priceFacet(min: number, max: number): CollectionFilter {
  return {
    id: 'filter.v.price',
    label: 'Price',
    type: 'PRICE_RANGE',
    values: [
      {
        id: 'filter.v.price.0',
        label: 'Price',
        count: 0,
        input: JSON.stringify({ price: { min, max } }),
      },
    ],
  } as CollectionFilter
}

const VENDOR_FACET = facet('filter.p.vendor', 'Vendor', [
  { label: 'Medline', input: '{"productVendor":"Medline"}' },
  { label: 'Dynarex', input: '{"productVendor":"Dynarex"}' },
])

// buildUrl mirrors the wrappers: filters serialised into ?filter= params.
const buildUrl = (next: string[]) => {
  const p = new URLSearchParams()
  next.forEach((f) => p.append('filter', f))
  const qs = p.toString()
  return qs ? `/category/gloves?${qs}` : '/category/gloves'
}

beforeEach(() => pushMock.mockClear())
afterEach(() => cleanup())

describe('FilterRail — optimistic multi-select (NF6)', () => {
  it('two rapid checkbox clicks keep BOTH selections in the second URL', () => {
    render(<FilterRail filters={[VENDOR_FACET]} activeFilters={[]} buildUrl={buildUrl} />)

    // No prop update happens between the clicks (server round-trip pending)
    const boxes = screen.getAllByRole('checkbox')
    fireEvent.click(boxes[0])
    fireEvent.click(boxes[1])

    expect(pushMock).toHaveBeenCalledTimes(2)
    const secondUrl = decodeURIComponent(pushMock.mock.calls[1][0])
    expect(secondUrl).toContain('Medline')
    expect(secondUrl).toContain('Dynarex')
  })

  it('reconciles with the server value when the prop changes (e.g. chip removal)', () => {
    const { rerender } = render(
      <FilterRail filters={[VENDOR_FACET]} activeFilters={['{"productVendor":"Medline"}']} buildUrl={buildUrl} />,
    )
    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'true')

    rerender(<FilterRail filters={[VENDOR_FACET]} activeFilters={[]} buildUrl={buildUrl} />)
    expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'false')
  })
})

describe('FilterRail — keyboard-operable price slider (NF5)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('arrow-key change commits (debounced) without any mouse interaction', () => {
    render(<FilterRail filters={[priceFacet(0, 100)]} activeFilters={[]} buildUrl={buildUrl} />)
    const slider = screen.getByRole('slider', { name: 'Maximum price' })

    // Keyboard: browser fires change on ArrowLeft, then keyup
    fireEvent.change(slider, { target: { value: '50' } })
    fireEvent.keyUp(slider, { key: 'ArrowLeft' })
    expect(pushMock).not.toHaveBeenCalled() // debounce pending

    vi.advanceTimersByTime(500)
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(pushMock.mock.calls[0][0])).toContain('"max":50')
  })

  it('blur commits immediately', () => {
    render(<FilterRail filters={[priceFacet(0, 100)]} activeFilters={[]} buildUrl={buildUrl} />)
    const slider = screen.getByRole('slider', { name: 'Maximum price' })

    fireEvent.change(slider, { target: { value: '30' } })
    fireEvent.blur(slider)
    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(pushMock.mock.calls[0][0])).toContain('"max":30')
  })

  it('committing at the range max clears the price filter instead of applying it', () => {
    render(
      <FilterRail
        filters={[priceFacet(0, 100)]}
        activeFilters={['{"price":{"min":0,"max":40}}']}
        buildUrl={buildUrl}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Maximum price' })
    fireEvent.change(slider, { target: { value: '100' } })
    fireEvent.blur(slider)
    expect(decodeURIComponent(pushMock.mock.calls[0][0])).not.toContain('price')
  })
})

describe('FilterRail — slider reset on Clear-all (NF17)', () => {
  it('Clear-all resets the slider back to the range max', () => {
    render(
      <FilterRail
        filters={[priceFacet(0, 100)]}
        activeFilters={['{"price":{"min":0,"max":40}}']}
        buildUrl={buildUrl}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Maximum price' }) as HTMLInputElement
    expect(slider.value).toBe('40')

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(slider.value).toBe('100')
    expect(pushMock).toHaveBeenCalledWith('/category/gloves')
  })

  it('slider follows an external prop change (chip removal of the price filter)', () => {
    const { rerender } = render(
      <FilterRail
        filters={[priceFacet(0, 100)]}
        activeFilters={['{"price":{"min":0,"max":40}}']}
        buildUrl={buildUrl}
      />,
    )
    rerender(<FilterRail filters={[priceFacet(0, 100)]} activeFilters={[]} buildUrl={buildUrl} />)
    expect((screen.getByRole('slider', { name: 'Maximum price' }) as HTMLInputElement).value).toBe('100')
  })
})
