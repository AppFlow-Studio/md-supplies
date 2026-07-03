import { describe, it, expect } from 'vitest'
import { getVisibleFilters, parsePriceBounds, calcPriceStep } from '../filters'
import type { CollectionFilter } from '../types'

function listFilter(overrides: Partial<CollectionFilter> = {}): CollectionFilter {
  return {
    id: 'filter.v.option.material',
    label: 'Material',
    type: 'LIST',
    values: [
      { id: 'nitrile', label: 'Nitrile', count: 12, input: '{"v":"nitrile"}' },
      { id: 'latex', label: 'Latex', count: 0, input: '{"v":"latex"}' },
      { id: 'vinyl', label: 'Vinyl', count: 0, input: '{"v":"vinyl"}' },
    ],
    ...overrides,
  }
}

describe('getVisibleFilters', () => {
  it('drops values with zero count that are not currently active', () => {
    const result = getVisibleFilters([listFilter()], [])
    expect(result).toHaveLength(1)
    expect(result[0].values.map((v) => v.id)).toEqual(['nitrile'])
  })

  it('keeps a zero-count value if it is currently active, so it can be deselected', () => {
    const result = getVisibleFilters([listFilter()], ['{"v":"latex"}'])
    expect(result[0].values.map((v) => v.id)).toEqual(['nitrile', 'latex'])
  })

  it('drops the entire group when every value ends up hidden', () => {
    const allZero = listFilter({
      values: [
        { id: 'latex', label: 'Latex', count: 0, input: '{"v":"latex"}' },
        { id: 'vinyl', label: 'Vinyl', count: 0, input: '{"v":"vinyl"}' },
      ],
    })
    expect(getVisibleFilters([allZero], [])).toEqual([])
  })

  it('always keeps PRICE_RANGE groups regardless of the count on their single value', () => {
    const priceFilter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 0, input: '{"price":{"min":0,"max":500}}' }],
    }
    expect(getVisibleFilters([priceFilter], [])).toEqual([priceFilter])
  })

  it('keeps unrelated groups untouched', () => {
    const vendor = listFilter({
      id: 'filter.p.vendor',
      label: 'Brand',
      values: [{ id: 'acme', label: 'Acme', count: 5, input: '{"v":"acme"}' }],
    })
    const result = getVisibleFilters([listFilter(), vendor], [])
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(vendor)
  })
})

describe('parsePriceBounds', () => {
  it('parses real min/max bounds from the filter value input', () => {
    const filter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 1, input: '{"price":{"min":0,"max":150}}' }],
    }
    expect(parsePriceBounds(filter)).toEqual({ min: 0, max: 150 })
  })

  it('falls back to a default range on malformed input', () => {
    const filter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 1, input: 'not-json' }],
    }
    expect(parsePriceBounds(filter)).toEqual({ min: 0, max: 500 })
  })

  it('falls back to a default range when max is not greater than min', () => {
    const filter: CollectionFilter = {
      id: 'filter.v.price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', count: 1, input: '{"price":{"min":100,"max":100}}' }],
    }
    expect(parsePriceBounds(filter)).toEqual({ min: 0, max: 500 })
  })
})

describe('calcPriceStep', () => {
  it('picks a coarser step as the range grows', () => {
    expect(calcPriceStep(20)).toBe(1)
    expect(calcPriceStep(100)).toBe(2)
    expect(calcPriceStep(500)).toBe(5)
    expect(calcPriceStep(2000)).toBe(10)
    expect(calcPriceStep(10000)).toBe(50)
    expect(calcPriceStep(50000)).toBe(100)
  })
})
