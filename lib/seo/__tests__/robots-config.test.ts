import { describe, it, expect } from 'vitest'
import { getRobotsConfig } from '../robots-config'

describe('getRobotsConfig', () => {
  it('disallows all crawlers on staging', () => {
    const cfg = getRobotsConfig(true)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    expect(rules.disallow).toBe('/')
    expect(rules.allow).toBeUndefined()
  })

  it('does not include sitemap on staging', () => {
    const cfg = getRobotsConfig(true)
    expect(cfg.sitemap).toBeUndefined()
  })

  it('allows root on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    expect(rules.allow).toBe('/')
  })

  it('disallows /api/ on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/api/')
  })

  it('disallows /account/ on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/account/')
  })

  it('disallows /cart on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/cart')
  })

  it('disallows /search on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/search')
  })

  it('disallows /internal/ on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/internal/')
  })

  it('includes sitemap URL on production', () => {
    const cfg = getRobotsConfig(false)
    const sitemap = Array.isArray(cfg.sitemap) ? cfg.sitemap[0] : cfg.sitemap
    expect(sitemap).toBeDefined()
    expect(sitemap).toMatch(/\/sitemap\.xml$/)
  })

  it('does not block CSS, JS, or images', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow ?? '']
    for (const path of disallowed) {
      expect(path).not.toMatch(/\.(css|js|png|jpg|svg|woff2?)/)
    }
  })
})
