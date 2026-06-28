import { describe, it, expect } from 'vitest'
import { INDUSTRIES, isIndustryComplete, type Industry } from '@/lib/industries'

const base: Industry = {
  name: 'Test',
  slug: 'test',
  collectionHandle: 'test',
  description: 'desc',
  image: 'img',
  buyerType: 'buyers',
}

describe('isIndustryComplete', () => {
  it('is complete when it has buyerType, description and at least one FAQ', () => {
    expect(
      isIndustryComplete({ ...base, faq: [{ question: 'q', answer: 'a' }] }),
    ).toBe(true)
  })

  it('is incomplete (thin) when it has no FAQ copy yet', () => {
    expect(isIndustryComplete(base)).toBe(false)
  })

  it('is incomplete when the FAQ array is empty', () => {
    expect(isIndustryComplete({ ...base, faq: [] })).toBe(false)
  })

  it('is incomplete when buyerType is missing', () => {
    expect(
      isIndustryComplete({ ...base, buyerType: '', faq: [{ question: 'q', answer: 'a' }] }),
    ).toBe(false)
  })

  it('every real industry has the core static content (name, slug, buyerType, description)', () => {
    for (const i of INDUSTRIES) {
      expect(i.name).toBeTruthy()
      expect(i.slug).toBeTruthy()
      expect(i.buyerType).toBeTruthy()
      expect(i.description).toBeTruthy()
    }
  })
})
