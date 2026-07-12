import { describe, it, expect } from 'vitest'
import { cleanShopifyAlt } from '@/lib/alt-text'

describe('cleanShopifyAlt', () => {
  it('strips the trailing "medical supply" suffix', () => {
    expect(cleanShopifyAlt('Trocar Supplies 3.2mm Resin Trocar Case of 20 medical supply')).toBe(
      'Trocar Supplies 3.2mm Resin Trocar Case of 20',
    )
  })

  it('strips "medical supplies" and is case-insensitive', () => {
    expect(cleanShopifyAlt('Nitrile Gloves Medical Supplies')).toBe('Nitrile Gloves')
    expect(cleanShopifyAlt('Nitrile Gloves - medical supply')).toBe('Nitrile Gloves')
  })

  it('leaves alts without the suffix untouched', () => {
    expect(cleanShopifyAlt('Blue nitrile exam gloves, box of 100')).toBe(
      'Blue nitrile exam gloves, box of 100',
    )
  })

  it('does not strip "medical supply" mid-string', () => {
    expect(cleanShopifyAlt('Medical supply cart with drawers')).toBe(
      'Medical supply cart with drawers',
    )
  })

  it('returns null for empty, null, or suffix-only values', () => {
    expect(cleanShopifyAlt(null)).toBeNull()
    expect(cleanShopifyAlt(undefined)).toBeNull()
    expect(cleanShopifyAlt('')).toBeNull()
    expect(cleanShopifyAlt('medical supply')).toBeNull()
  })
})
