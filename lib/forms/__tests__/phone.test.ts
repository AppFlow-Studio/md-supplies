import { describe, it, expect } from 'vitest'
import { isValidNanpPhone } from '@/lib/forms/phone'

describe('isValidNanpPhone', () => {
  it('accepts a real US number', () => {
    expect(isValidNanpPhone('+1 (212) 555-0100')).toBe(true)
  })

  it('accepts a real Canadian number', () => {
    expect(isValidNanpPhone('+1 (416) 555-0199')).toBe(true)
  })

  it('accepts a US number without a leading +1', () => {
    expect(isValidNanpPhone('(212) 555-0100')).toBe(true)
  })

  it('rejects a fake area code', () => {
    expect(isValidNanpPhone('+1 (555) 000-0000')).toBe(false)
  })

  it('rejects a too-short number', () => {
    expect(isValidNanpPhone('555-1234')).toBe(false)
  })

  it('rejects an unparseable string', () => {
    expect(isValidNanpPhone('not a phone number')).toBe(false)
  })

  it('rejects a non-NANP international number', () => {
    expect(isValidNanpPhone('+44 20 7946 0958')).toBe(false)
  })

  it('accepts an empty string (still optional)', () => {
    expect(isValidNanpPhone('')).toBe(true)
  })

  it('accepts a whitespace-only string as empty', () => {
    expect(isValidNanpPhone('   ')).toBe(true)
  })
})
