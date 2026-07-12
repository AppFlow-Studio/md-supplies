import { describe, it, expect } from 'vitest'
import { sanitizeStyledText } from '../SearchDropdown'

describe('sanitizeStyledText (NF16)', () => {
  it('strips an onclick payload smuggled via a missing space before the attribute', () => {
    const out = sanitizeStyledText('<span/onclick=alert(1)>Gloves</span>')
    expect(out).not.toMatch(/onclick/i)
    expect(out).toBe('<span>Gloves</span>')
  })

  it('still highlights via clean mark/span tags', () => {
    expect(sanitizeStyledText('Blue <mark>Gloves</mark>')).toBe('Blue <mark>Gloves</mark>')
  })

  it('strips disallowed tags entirely, including their attributes', () => {
    expect(sanitizeStyledText('<img src=x onerror=alert(1)>Gloves')).toBe('Gloves')
  })

  it('strips a script tag', () => {
    expect(sanitizeStyledText('<script>alert(1)</script>Gloves')).toBe('alert(1)Gloves')
  })
})
