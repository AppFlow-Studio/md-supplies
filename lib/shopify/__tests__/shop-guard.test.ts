import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  assertShopDomainAllowed,
  allowedShopDomain,
  normalizeShopDomain,
  ShopDomainNotAllowedError,
  PRODUCTION_SHOP_DOMAIN,
  QA_SHOP_DOMAIN,
} from '../shop-guard'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('normalizeShopDomain', () => {
  it('reduces presentation variants of the same host to one value', () => {
    for (const variant of [
      'daebb2-76.myshopify.com',
      'DAEBB2-76.MyShopify.com',
      '  daebb2-76.myshopify.com  ',
      'https://daebb2-76.myshopify.com',
      'http://daebb2-76.myshopify.com/',
      'https://daebb2-76.myshopify.com/admin/products',
      'https://daebb2-76.myshopify.com:443',
      'https://user:pass@daebb2-76.myshopify.com',
      'daebb2-76.myshopify.com?foo=bar',
      'daebb2-76.myshopify.com#frag',
    ]) {
      expect(normalizeShopDomain(variant), variant).toBe(PRODUCTION_SHOP_DOMAIN)
    }
  })

  it('returns empty for unusable input rather than a permissive default', () => {
    for (const bad of ['', '   ', null, undefined, 123 as unknown as string]) {
      expect(normalizeShopDomain(bad)).toBe('')
    }
  })
})

describe('allowedShopDomain', () => {
  it('defaults to the QA store when nothing is declared', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    expect(allowedShopDomain()).toBe(QA_SHOP_DOMAIN)
  })

  it('honours an explicit declaration', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', 'https://Example.myshopify.com/')
    expect(allowedShopDomain()).toBe('example.myshopify.com')
  })
})

describe('assertShopDomainAllowed', () => {
  it('accepts the QA store by default and returns it normalized', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    expect(assertShopDomainAllowed(`https://${QA_SHOP_DOMAIN}/`)).toBe(QA_SHOP_DOMAIN)
  })

  it('rejects the production store by default', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    expect(() => assertShopDomainAllowed(PRODUCTION_SHOP_DOMAIN)).toThrow(ShopDomainNotAllowedError)
  })

  it('names production explicitly so the failure is diagnosable, not just "mismatch"', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    expect(() => assertShopDomainAllowed(PRODUCTION_SHOP_DOMAIN)).toThrow(/PRODUCTION store/)
  })

  it('rejects production however it is dressed up', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    for (const variant of [
      'https://daebb2-76.myshopify.com',
      'DAEBB2-76.myshopify.com',
      ' https://daebb2-76.myshopify.com/ ',
      'https://daebb2-76.myshopify.com:443/admin',
    ]) {
      expect(() => assertShopDomainAllowed(variant), variant).toThrow(ShopDomainNotAllowedError)
    }
  })

  it('rejects any third shop, not just production', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    expect(() => assertShopDomainAllowed('some-other-store.myshopify.com')).toThrow(
      ShopDomainNotAllowedError,
    )
  })

  it('fails closed on a missing or empty value', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    for (const bad of ['', '   ', null, undefined]) {
      expect(() => assertShopDomainAllowed(bad)).toThrow(ShopDomainNotAllowedError)
    }
  })

  it('allows production only when it is declared deliberately', () => {
    // The eventual production path stays open: it just cannot be reached by
    // inheriting a variable, only by naming the shop on purpose.
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', PRODUCTION_SHOP_DOMAIN)
    expect(assertShopDomainAllowed(PRODUCTION_SHOP_DOMAIN)).toBe(PRODUCTION_SHOP_DOMAIN)
    // And QA is then the one refused, because the rule is agreement.
    expect(() => assertShopDomainAllowed(QA_SHOP_DOMAIN)).toThrow(ShopDomainNotAllowedError)
  })

  it('quotes the source in the message so a failure says what to change', () => {
    vi.stubEnv('SHOPIFY_ALLOWED_SHOP_DOMAIN', '')
    expect(() => assertShopDomainAllowed(PRODUCTION_SHOP_DOMAIN, 'SHOPIFY_STORE_DOMAIN')).toThrow(
      /SHOPIFY_STORE_DOMAIN/,
    )
  })
})
