import { describe, it, expect } from 'vitest'
import { getNumericShopifyProductId } from '../product-id'

describe('getNumericShopifyProductId', () => {
  it('extracts the numeric id from a real Shopify GID', () => {
    expect(getNumericShopifyProductId('gid://shopify/Product/7857484955713')).toBe(7857484955713)
  })

  it('extracts the numeric id from a bare numeric string', () => {
    expect(getNumericShopifyProductId('123')).toBe(123)
  })

  it.each([
    ['empty string', ''],
    ['non-numeric segment', 'gid://shopify/Product/abc123'],
    ['trailing slash with nothing after it', 'gid://shopify/Product/'],
    ['decimal id', 'gid://shopify/Product/123.5'],
    ['negative-looking id', 'gid://shopify/Product/-123'],
    ['zero', 'gid://shopify/Product/0'],
    ['unsafe integer', `gid://shopify/Product/${'9'.repeat(20)}`],
    ['whitespace padded', 'gid://shopify/Product/ 123'],
  ])('rejects a malformed GID: %s', (_label, input) => {
    expect(() => getNumericShopifyProductId(input)).toThrow('Invalid Shopify product ID')
  })
})
