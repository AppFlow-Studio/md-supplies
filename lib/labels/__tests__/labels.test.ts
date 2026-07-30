import { describe, it, expect } from 'vitest'
import { resolveRxLabel, resolveBackorderLabel, resolveProductLabels } from '../labels'

const NOW = new Date('2026-07-30T12:00:00Z')

describe('resolveRxLabel', () => {
  it('recognizes both catalog RX tag values', () => {
    expect(resolveRxLabel(['rx-required'])?.type).toBe('rx-only')
    expect(resolveRxLabel(['compliance:rx-only'])?.type).toBe('rx-only')
  })

  it('returns null without an RX tag or without tags', () => {
    expect(resolveRxLabel(['free-shipping'])).toBeNull()
    expect(resolveRxLabel(undefined)).toBeNull()
  })
})

describe('resolveBackorderLabel', () => {
  it('renders a future parseable ETA', () => {
    const label = resolveBackorderLabel({
      estimatedRestockDate: '2026-09-15',
      availableForSale: false,
      now: NOW,
    })
    expect(label?.text).toBe('Back-ordered – ships 2026-09-15')
    expect(label?.source).toBe('metafield')
  })

  it('suppresses a stale (past) parseable ETA — no stale promise', () => {
    expect(
      resolveBackorderLabel({ estimatedRestockDate: '2026-06-01', availableForSale: false, now: NOW }),
    ).toBeNull()
  })

  it('keeps a same-day ETA valid through end of day', () => {
    expect(
      resolveBackorderLabel({ estimatedRestockDate: '2026-07-30', availableForSale: false, now: NOW }),
    ).not.toBeNull()
  })

  it('renders unparseable operational text as-is', () => {
    const label = resolveBackorderLabel({
      estimatedRestockDate: 'late August',
      availableForSale: false,
      now: NOW,
    })
    expect(label?.text).toBe('Back-ordered – ships late August')
  })

  it('never labels an available product, and never labels without a value', () => {
    expect(
      resolveBackorderLabel({ estimatedRestockDate: '2026-09-15', availableForSale: true, now: NOW }),
    ).toBeNull()
    expect(resolveBackorderLabel({ estimatedRestockDate: null, availableForSale: false, now: NOW })).toBeNull()
    expect(resolveBackorderLabel({ estimatedRestockDate: '   ', availableForSale: false, now: NOW })).toBeNull()
  })
})

describe('resolveProductLabels', () => {
  it('never produces a free-shipping label from tags (resolver-only claim)', () => {
    const labels = resolveProductLabels({ tags: ['free-shipping'], availableForSale: true })
    expect(labels).toEqual([])
  })

  it('orders rx before backorder', () => {
    const labels = resolveProductLabels({
      tags: ['rx-required'],
      estimatedRestockDate: '2099-01-01',
      availableForSale: false,
      now: NOW,
    })
    expect(labels.map((l) => l.type)).toEqual(['rx-only', 'backorder'])
  })
})
