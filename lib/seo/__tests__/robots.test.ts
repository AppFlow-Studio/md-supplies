import { describe, it, expect, vi } from 'vitest'
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

// M11: staging must be automatic on Vercel preview deploys — nobody sets a flag.
describe('STAGING_GUARD auto-derivation from VERCEL_ENV', () => {
  it('a preview deploy is noindex,nofollow with no manual flag set', async () => {
    vi.resetModules()
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { buildRobots: freshBuildRobots } = await import('../robots')
    expect(freshBuildRobots({ pageType: 'homepage' })).toBe('noindex,nofollow')
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('a preview deploy gets a Disallow-everything robots.txt with no manual flag', async () => {
    vi.resetModules()
    vi.stubEnv('VERCEL_ENV', 'preview')
    const { getRobotsConfig } = await import('../robots-config')
    expect(getRobotsConfig()).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
