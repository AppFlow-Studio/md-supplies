import { describe, it, expect } from 'vitest'
import { OCC_HUB } from '@/lib/occ'
import { getOccCollectionHandle } from '@/lib/occ-collection'

describe('OCC hub data (E8 §9.1)', () => {
  // OCC now renders the full canonical collection through CategoryResults,
  // exactly like a category page. There is no featured block and no
  // hardcoded product data at all — the placeholder products that once lived
  // here were fake catalog entries shown in front of the real assortment.
  it('carries no hardcoded product data', () => {
    expect('eligibleProducts' in OCC_HUB).toBe(false)
    expect(JSON.stringify(OCC_HUB)).not.toContain('placehold.co')
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
