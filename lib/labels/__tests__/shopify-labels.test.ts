import { describe, it, expect } from 'vitest'
import { resolveShopifyLabels, type RawProductLabels } from '../shopify-labels'

const NOW = new Date('2026-08-02T12:00:00Z')

function labels(...entries: Record<string, string | null>[]): RawProductLabels {
  return {
    references: {
      nodes: entries.map((e) => ({
        fields: Object.entries(e).map(([key, value]) => ({ key, value })),
      })),
    },
  }
}

describe('resolveShopifyLabels', () => {
  it('returns nothing when the definitions do not exist yet (safe to ship)', () => {
    expect(resolveShopifyLabels(null, NOW)).toEqual([])
    expect(resolveShopifyLabels({}, NOW)).toEqual([])
    expect(resolveShopifyLabels({ references: { nodes: [] } }, NOW)).toEqual([])
  })

  it('maps text, style and priority onto the shared contract', () => {
    const out = resolveShopifyLabels(labels({ text: 'Rx Only', style: 'rx', priority: '10' }), NOW)
    expect(out).toEqual([
      { type: 'rx-only', text: 'Rx Only', accessibleText: 'Rx Only', priority: 10, source: 'metaobject' },
    ])
  })

  it('falls back to the visible text when accessible_text is blank', () => {
    const out = resolveShopifyLabels(labels({ text: 'Rx Only', accessible_text: '  ' }), NOW)
    expect(out[0].accessibleText).toBe('Rx Only')
  })

  it('treats unknown styles as decorative promo labels', () => {
    const out = resolveShopifyLabels(labels({ text: 'Free Shipping!', style: 'promo' }), NOW)
    expect(out[0].type).toBe('promo')
    const neutral = resolveShopifyLabels(labels({ text: 'New', style: 'whatever' }), NOW)
    expect(neutral[0].type).toBe('promo')
  })

  it('sorts by priority, defaulting missing/invalid priorities behind explicit ones', () => {
    const out = resolveShopifyLabels(
      labels(
        { text: 'Third' },
        { text: 'First', priority: '1' },
        { text: 'Second', priority: '2' },
      ),
      NOW,
    )
    expect(out.map((l) => l.text)).toEqual(['First', 'Second', 'Third'])
  })

  it('drops entries with no visible text', () => {
    expect(resolveShopifyLabels(labels({ text: '   ', style: 'rx' }), NOW)).toEqual([])
    expect(resolveShopifyLabels(labels({ style: 'rx' }), NOW)).toEqual([])
  })

  describe('scheduling', () => {
    it('hides a label whose window has not opened', () => {
      expect(resolveShopifyLabels(labels({ text: 'Soon', starts_at: '2026-09-01T00:00:00Z' }), NOW)).toEqual([])
    })

    it('hides an expired label rather than leaving a stale promise', () => {
      expect(resolveShopifyLabels(labels({ text: 'Gone', ends_at: '2026-07-01T00:00:00Z' }), NOW)).toEqual([])
    })

    it('shows a label inside its window', () => {
      const out = resolveShopifyLabels(
        labels({ text: 'Now', starts_at: '2026-08-01T00:00:00Z', ends_at: '2026-08-31T00:00:00Z' }),
        NOW,
      )
      expect(out).toHaveLength(1)
    })

    it('ignores unparseable schedule values instead of hiding the label', () => {
      const out = resolveShopifyLabels(labels({ text: 'Always', starts_at: 'not-a-date' }), NOW)
      expect(out).toHaveLength(1)
    })
  })
})
