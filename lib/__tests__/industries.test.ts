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

describe('industry -> Shopify tag mapping', () => {
  const expectedTags: Record<string, string> = {
    'urgent-care': 'industry:urgent-care',
    'hrt-clinics': 'industry:hrt-surgery',
    'home-health': 'industry:home-care',
    'clinics-doctors-offices': 'industry:clinic',
    pharmacies: 'industry:pharmacy',
  }

  it('maps exactly the 5 industries with a confirmed Shopify tag', () => {
    for (const [slug, tag] of Object.entries(expectedTags)) {
      const industry = INDUSTRIES.find((i) => i.slug === slug)
      expect(industry?.tag).toBe(tag)
    }
  })

  it('leaves every other industry without a tag', () => {
    const mapped = new Set(Object.keys(expectedTags))
    for (const i of INDUSTRIES) {
      if (!mapped.has(i.slug)) {
        expect(i.tag).toBeUndefined()
      }
    }
  })
})
