import { describe, it, expect } from 'vitest'
import { buildRobots } from '../robots'

describe('buildRobots', () => {
  it('returns index,follow for all standard public page types', () => {
    const publicTypes = [
      'homepage', 'categories-hub', 'category', 'subcategory',
      'product', 'partners', 'partner-detail', 'industry',
      'occ', 'blog-hub', 'blog-article',
    ] as const
    for (const pageType of publicTypes) {
      expect(buildRobots({ pageType })).toBe('index,follow')
    }
  })

  it('returns noindex,follow for utility pages', () => {
    expect(buildRobots({ pageType: 'utility' })).toBe('noindex,follow')
  })

  it('returns noindex,follow when noIndex is explicitly true', () => {
    expect(buildRobots({ pageType: 'category', noIndex: true })).toBe('noindex,follow')
  })

  it('returns noindex,follow for thin content pages', () => {
    expect(buildRobots({ pageType: 'industry', isThinContent: true })).toBe('noindex,follow')
  })

  it('returns noindex,nofollow when staging guard is active (overrides everything)', () => {
    expect(buildRobots({ pageType: 'homepage', isStaging: true })).toBe('noindex,nofollow')
    expect(buildRobots({ pageType: 'utility', isStaging: true })).toBe('noindex,nofollow')
    expect(buildRobots({ pageType: 'blog-article', isStaging: true, noIndex: false })).toBe('noindex,nofollow')
  })

  it('staging guard takes priority over noIndex and isThinContent', () => {
    expect(buildRobots({ pageType: 'category', isStaging: true, noIndex: true, isThinContent: true })).toBe('noindex,nofollow')
  })
})
