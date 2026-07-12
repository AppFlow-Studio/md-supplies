import { describe, it, expect } from 'vitest'
import { safeNextPath } from '@/lib/safe-redirect'

describe('safeNextPath', () => {
  it('allows a plain same-origin path', () => {
    expect(safeNextPath('/account/orders')).toBe('/account/orders')
    expect(safeNextPath('/account/orders/1042?tab=items')).toBe('/account/orders/1042?tab=items')
  })

  it('falls back when next is missing', () => {
    expect(safeNextPath(null)).toBe('/account')
    expect(safeNextPath('')).toBe('/account')
  })

  it('rejects the userinfo trick (@evil.com)', () => {
    expect(safeNextPath('@evil.com')).toBe('/account')
  })

  it('rejects absolute URLs with a scheme', () => {
    expect(safeNextPath('https://evil.com/account')).toBe('/account')
    expect(safeNextPath('javascript:alert(1)')).toBe('/account')
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeNextPath('//evil.com')).toBe('/account')
    expect(safeNextPath('/\\evil.com')).toBe('/account')
  })

  it('respects a custom fallback', () => {
    expect(safeNextPath('//evil.com', '/')).toBe('/')
  })
})
