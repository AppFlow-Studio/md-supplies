import { describe, it, expect } from 'vitest'
import { getSitemapUrls } from '../sitemap'

const EXCLUDED_PATHS = ['/search', '/cart', '/account', '/internal', '/api']

describe('getSitemapUrls', () => {
  it('returns an empty array on staging', () => {
    expect(getSitemapUrls(true)).toHaveLength(0)
  })

  it('returns non-empty array on production', () => {
    expect(getSitemapUrls(false).length).toBeGreaterThan(0)
  })

  it('includes homepage', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u === 'https://mdsupplies.com/')).toBe(true)
  })

  it('includes /categories', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/categories'))).toBe(true)
  })

  it('includes /industries', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/industries'))).toBe(true)
  })

  it('includes /partners', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/partners'))).toBe(true)
  })

  it('includes /blog', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/blog'))).toBe(true)
  })

  it('never includes excluded paths', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    for (const excluded of EXCLUDED_PATHS) {
      const match = urls.find((u) => {
        try { return new URL(u).pathname === excluded || new URL(u).pathname.startsWith(excluded) }
        catch { return false }
      })
      expect(match, `Sitemap must not contain ${excluded}`).toBeUndefined()
    }
  })

  it('all URLs use production SITE_URL (https://mdsupplies.com)', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    for (const url of urls) {
      expect(url.startsWith('https://mdsupplies.com'), `URL must start with site URL: ${url}`).toBe(true)
    }
  })

  it('homepage priority is 1', () => {
    const entry = getSitemapUrls(false).find((e) => e.url === 'https://mdsupplies.com/')
    expect(entry?.priority).toBe(1)
  })
})
