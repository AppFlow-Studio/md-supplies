import { describe, it, expect } from 'vitest'
import { resolveVariantAwareTitle } from '../resolve-variant-title'

// Bilal, 2026-09-14: B2080C/B2083C "Disposable Blunt Tip, Trocar Combo Kit" —
// 3.5mm should read "(B2080C)", 4.5mm should read "(B2083C)", generically for
// any multi-SKU-variant product, never hardcoded to this one.
describe('resolveVariantAwareTitle', () => {
  const variants = [{ sku: 'B2080C' }, { sku: 'B2083C' }]

  it('replaces the baked-in default-variant SKU suffix with the selected variant SKU', () => {
    expect(
      resolveVariantAwareTitle('Disposable Blunt Tip, Trocar Combo Kit (B2080C)', variants, { sku: 'B2083C' }),
    ).toBe('Disposable Blunt Tip, Trocar Combo Kit (B2083C)')
  })

  it('leaves the title unchanged when the selected variant is the one already baked in', () => {
    expect(
      resolveVariantAwareTitle('Disposable Blunt Tip, Trocar Combo Kit (B2080C)', variants, { sku: 'B2080C' }),
    ).toBe('Disposable Blunt Tip, Trocar Combo Kit (B2080C)')
  })

  it('never touches a legitimate parenthetical that is not a real variant SKU', () => {
    expect(
      resolveVariantAwareTitle('Nitrile Exam Gloves (Sterile)', variants, { sku: 'B2083C' }),
    ).toBe('Nitrile Exam Gloves (Sterile)')
  })

  it('leaves the title unchanged when there is no trailing parenthetical at all', () => {
    expect(
      resolveVariantAwareTitle('Disposable Blunt Tip, Trocar Combo Kit', variants, { sku: 'B2083C' }),
    ).toBe('Disposable Blunt Tip, Trocar Combo Kit')
  })

  it('leaves the title unchanged when the product has only one distinct variant SKU', () => {
    const singleSkuVariants = [{ sku: 'B2080C' }, { sku: 'B2080C' }]
    expect(
      resolveVariantAwareTitle('Disposable Blunt Tip, Trocar Combo Kit (B2080C)', singleSkuVariants, { sku: 'B2080C' }),
    ).toBe('Disposable Blunt Tip, Trocar Combo Kit (B2080C)')
  })

  it('leaves the title unchanged when no variant has a SKU at all', () => {
    const noSkuVariants = [{ sku: null }, { sku: null }]
    expect(
      resolveVariantAwareTitle('Rollator Walker (4-Wheel)', noSkuVariants, { sku: null }),
    ).toBe('Rollator Walker (4-Wheel)')
  })

  it('strips the suffix cleanly when the selected variant has no SKU of its own', () => {
    expect(
      resolveVariantAwareTitle('Disposable Blunt Tip, Trocar Combo Kit (B2080C)', variants, { sku: null }),
    ).toBe('Disposable Blunt Tip, Trocar Combo Kit')
  })

  it('does not hardcode B2080C — works generically for a different mixed-SKU product', () => {
    const rollatorVariants = [{ sku: 'RW-100' }, { sku: 'RW-200' }]
    expect(
      resolveVariantAwareTitle('4-Wheel Rollator Walker (RW-100)', rollatorVariants, { sku: 'RW-200' }),
    ).toBe('4-Wheel Rollator Walker (RW-200)')
  })
})
