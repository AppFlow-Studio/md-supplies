import { describe, it, expect } from 'vitest'
import {
  resolveRxLabel,
  resolveBackorderLabel,
  resolveProductLabels,
  isBackorderedMetafield,
} from '../labels'

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

  // The badge must render from RX POLICY (tag ∪ custom.is_rx_only), matching
  // the checkout gate. Tag-only detection missed 40 ACTIVE prescription
  // products in the 2026-08-02 catalog audit.
  it('renders from the metafield alone, with no RX tag present', () => {
    expect(resolveRxLabel([], { value: 'true' })?.type).toBe('rx-only')
    expect(resolveRxLabel(['category:pharmacy-products'], 'true')?.type).toBe('rx-only')
    expect(resolveRxLabel(undefined, { value: 'yes' })?.type).toBe('rx-only')
  })

  it('does not widen on falsey / absent metafield values', () => {
    expect(resolveRxLabel([], { value: 'false' })).toBeNull()
    expect(resolveRxLabel([], { value: '' })).toBeNull()
    expect(resolveRxLabel([], null)).toBeNull()
    expect(resolveRxLabel([], undefined)).toBeNull()
  })

  it('a client-authored label value can never manufacture RX status', () => {
    // Only the tag and the store's own metafield are RX sources.
    expect(resolveRxLabel(['promo:rx-only-lookalike'])).toBeNull()
    expect(resolveRxLabel([], { value: 'RX Only' })).toBeNull()
  })
})

describe('isBackorderedMetafield', () => {
  it('recognizes truthy raw/string/boolean shapes', () => {
    expect(isBackorderedMetafield({ value: 'true' })).toBe(true)
    expect(isBackorderedMetafield('1')).toBe(true)
    expect(isBackorderedMetafield('yes')).toBe(true)
    expect(isBackorderedMetafield(true)).toBe(true)
  })

  it('does not widen on falsey / absent values', () => {
    expect(isBackorderedMetafield({ value: 'false' })).toBe(false)
    expect(isBackorderedMetafield('')).toBe(false)
    expect(isBackorderedMetafield(null)).toBe(false)
    expect(isBackorderedMetafield(undefined)).toBe(false)
    expect(isBackorderedMetafield(false)).toBe(false)
  })
})

// Bilal, 2026-08-18 (supersedes DEV-SHIP-04's "always exactly Backorder"
// rule): the boolean (`custom.backorder`) remains the SOLE trigger — an ETA
// never creates or shapes Backorder status on its own (truth table rule 6).
// But once triggered, a valid, non-expired ETA IS appended to the text; a
// missing, stale, or unparseable ETA falls back to the plain "Backorder"
// text, same as before.
describe('resolveBackorderLabel', () => {
  const FUTURE_ETA = '2026-09-15'
  const STALE_ETA = '2026-06-01'
  const MALFORMED_ETA = 'late August'

  it('true + valid future ETA = "Backorder" with the ship date appended', () => {
    const label = resolveBackorderLabel({ isBackordered: true, estimatedRestockDate: FUTURE_ETA, now: NOW })
    expect(label?.text).toBe('Backorder, ships 2026-09-15')
    expect(label?.accessibleText).toBe('Backorder, ships 2026-09-15')
  })

  it('true + stale/expired ETA = exactly "Backorder"', () => {
    const label = resolveBackorderLabel({ isBackordered: true, estimatedRestockDate: STALE_ETA, now: NOW })
    expect(label?.text).toBe('Backorder')
    expect(label?.accessibleText).toBe('Backorder')
  })

  it('true + malformed/free-text ETA = exactly "Backorder"', () => {
    const label = resolveBackorderLabel({ isBackordered: true, estimatedRestockDate: MALFORMED_ETA, now: NOW })
    expect(label?.text).toBe('Backorder')
    expect(label?.accessibleText).toBe('Backorder')
  })

  it('true + missing ETA = exactly "Backorder"', () => {
    const label = resolveBackorderLabel({ isBackordered: true, estimatedRestockDate: null, now: NOW })
    expect(label?.text).toBe('Backorder')
    expect(label?.accessibleText).toBe('Backorder')
    expect(label?.source).toBe('metafield')
  })

  it('true + empty/whitespace-only ETA = exactly "Backorder"', () => {
    const label = resolveBackorderLabel({ isBackordered: true, estimatedRestockDate: '   ', now: NOW })
    expect(label?.text).toBe('Backorder')
  })

  it('false + any ETA = no label', () => {
    expect(resolveBackorderLabel({ isBackordered: false, estimatedRestockDate: FUTURE_ETA, now: NOW })).toBeNull()
  })

  it('null + any ETA = no label', () => {
    expect(resolveBackorderLabel({ isBackordered: null, estimatedRestockDate: FUTURE_ETA, now: NOW })).toBeNull()
  })

  it('missing boolean + any ETA = no label', () => {
    expect(resolveBackorderLabel({ estimatedRestockDate: FUTURE_ETA, now: NOW })).toBeNull()
  })

  // Truth table rule 6: a date by itself must never create Backorder status.
  it('a date alone, with no boolean at all, never creates Backorder status', () => {
    expect(resolveBackorderLabel({ estimatedRestockDate: FUTURE_ETA })).toBeNull()
    expect(resolveBackorderLabel({ isBackordered: undefined, estimatedRestockDate: FUTURE_ETA })).toBeNull()
  })

  it('no date, "ships", "estimated", or "available" wording for a stale/malformed/missing/empty ETA', () => {
    for (const eta of [STALE_ETA, MALFORMED_ETA, null, '']) {
      const label = resolveBackorderLabel({ isBackordered: true, estimatedRestockDate: eta, now: NOW })
      expect(label?.text).toBe('Backorder')
      expect(label?.accessibleText).toBe('Backorder')
      expect(label?.accessibleText).not.toMatch(/ships|estimated|available|\d{4}-\d{2}-\d{2}/i)
    }
  })
})

describe('resolveProductLabels', () => {
  it('never produces a free-shipping label from tags (resolver-only claim)', () => {
    const labels = resolveProductLabels({ tags: ['free-shipping'] })
    expect(labels).toEqual([])
  })

  it('orders rx before backorder', () => {
    const labels = resolveProductLabels({
      tags: ['rx-required'],
      isBackordered: true,
      estimatedRestockDate: '2099-01-01',
      now: NOW,
    })
    expect(labels.map((l) => l.type)).toEqual(['rx-only', 'backorder'])
  })

  it('omits backorder when the boolean is not set, regardless of ETA', () => {
    const labels = resolveProductLabels({
      tags: ['rx-required'],
      isBackordered: false,
      estimatedRestockDate: '2099-01-01',
      now: NOW,
    })
    expect(labels.map((l) => l.type)).toEqual(['rx-only'])
  })
})
