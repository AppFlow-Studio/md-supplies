import { describe, it, expect } from 'vitest'
import { jsonLdSafe } from '../index'

describe('jsonLdSafe', () => {
  it('escapes < to prevent </script> injection', () => {
    const result = jsonLdSafe({ name: 'test</script>' })
    expect(result).not.toContain('</script>')
    expect(result).not.toContain('<')
  })

  it('escapes > characters', () => {
    expect(jsonLdSafe({ name: 'a>b' })).not.toContain('>')
  })

  it('escapes & characters', () => {
    expect(jsonLdSafe({ url: 'a&b' })).not.toContain('&')
  })

  it('output is valid JSON that round-trips correctly', () => {
    const input = { name: 'test</script>&more', url: 'https://example.com/a>b' }
    const escaped = jsonLdSafe(input)
    const parsed = JSON.parse(escaped)
    expect(parsed.name).toBe(input.name)
    expect(parsed.url).toBe(input.url)
  })
})
