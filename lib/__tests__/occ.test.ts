import { describe, it, expect } from 'vitest'
import { OCC_HUB } from '@/lib/occ'
import { getOccCollectionHandle } from '@/lib/occ-collection'

describe('OCC hub data (E8 §9.1)', () => {
  // DEV-OCC-01: the featured block is sourced live from the canonical OCC
  // collection at request time (app/solutions/occ/page.tsx). The static hub
  // data must therefore ship NO invented catalog entries — the previous
  // placehold.co products were fake products presented as real assortment.
  it('ships no hardcoded placeholder products', () => {
    expect(OCC_HUB.eligibleProducts).toEqual([])
  })

  it('any product present still satisfies the card contract (handle + real price)', () => {
    for (const p of OCC_HUB.eligibleProducts) {
      expect(p.handle.trim()).not.toBe('')
      expect(p.image).not.toMatch(/placehold\.co/)
      expect(Number.isFinite(p.price)).toBe(true)
      expect(p.price).toBeGreaterThan(0)
    }
  })

  it('every linked eligible category is a real routable handle', () => {
    // `gifts-toys` had no backing collection and 404'd; keep that regression out.
    const handles = OCC_HUB.eligibleCategories.map((c) => c.handle)
    expect(handles.length).toBeGreaterThan(0)
    expect(handles).not.toContain('gifts-toys')
    for (const h of handles) expect(h.trim()).not.toBe('')
  })

  it('resolves one canonical OCC collection handle, not a guess list', () => {
    expect(getOccCollectionHandle()).toBe('occ')
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
