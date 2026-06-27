import { describe, it, expect } from 'vitest'
import { OCC_HUB } from '@/lib/occ'

describe('OCC hub data (E8 §9.1)', () => {
  it('every eligible product has a Shopify handle to resolve a live price', () => {
    expect(OCC_HUB.eligibleProducts.length).toBeGreaterThan(0)
    for (const p of OCC_HUB.eligibleProducts) {
      expect(p.handle.trim()).not.toBe('')
    }
  })

  it('every eligible product has a positive fallback price (no $0/NaN)', () => {
    for (const p of OCC_HUB.eligibleProducts) {
      expect(Number.isFinite(p.price)).toBe(true)
      expect(p.price).toBeGreaterThan(0)
    }
  })

  it('has approved FAQ copy so the FAQPage schema can render', () => {
    const faq = OCC_HUB.faq ?? []
    expect(faq.length).toBeGreaterThanOrEqual(3)
    for (const f of faq) {
      expect(f.question.trim()).not.toBe('')
      expect(f.answer.trim()).not.toBe('')
    }
  })

  it('positions the program broadly, not tied to "Operation Christmas Child"', () => {
    const blob = `${OCC_HUB.title} ${OCC_HUB.intro} ${OCC_HUB.programExplanation}`.toLowerCase()
    expect(blob).not.toContain('operation christmas child')
    // Broader charity/nonprofit framing is present.
    expect(blob).toMatch(/nonprofit|charit/)
  })
})
