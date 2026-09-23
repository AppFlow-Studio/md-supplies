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

  // B6705 (2026-09-15): title bakes "(B6705)" but the real variant SKU is
  // "B6705C" — a trailing code letter missing from the title text.
  describe('when the baked-in suffix is a truncated SKU (B6705 case)', () => {
    const trocarVariants = [{ sku: 'B6705C' }, { sku: 'B7419C' }, { sku: 'B1954C' }]

    it('still replaces the suffix when it is a prefix of exactly one variant SKU', () => {
      expect(
        resolveVariantAwareTitle(
          '3.2mm Resin Trocar, Wrapped Kit, with Antiseptic, Medium Glove (B6705)',
          trocarVariants,
          { sku: 'B7419C' },
        ),
      ).toBe('3.2mm Resin Trocar, Wrapped Kit, with Antiseptic, Medium Glove (B7419C)')
    })

    it('leaves the title unchanged when the truncated suffix is a prefix of more than one variant SKU', () => {
      const ambiguousVariants = [{ sku: 'B67050C' }, { sku: 'B67051C' }]
      expect(
        resolveVariantAwareTitle('Ambiguous Kit (B6705)', ambiguousVariants, { sku: 'B67051C' }),
      ).toBe('Ambiguous Kit (B6705)')
    })
  })

  // Sardor's audit, 2026-09-22 (15015-24DELR): some titles bake the SKU in
  // twice — inline AND parenthesised. Rewriting only the parenthetical left
  // the inline copy stale, producing a title that named one SKU and
  // parenthesised another. A sweep of all 7,230 live products found exactly 10
  // of these; every one has the repeat as the LAST token of the base title.
  describe('when the baked-in SKU is repeated inline as well as parenthesised', () => {
    const wheelchair = [{ sku: '15015-24DELR' }, { sku: '15015-26DELR' }, { sku: '15015-28DELR' }]

    it('strips the stale inline repeat instead of leaving two different SKUs in one title', () => {
      expect(
        resolveVariantAwareTitle(
          'Bariatric Reclining Wheelchair w/ ELR 15015-24DELR (15015-24DELR)',
          wheelchair,
          { sku: '15015-26DELR' },
        ),
      ).toBe('Bariatric Reclining Wheelchair w/ ELR (15015-26DELR)')
    })

    it('also removes the redundancy when the baked-in variant is the selected one', () => {
      expect(
        resolveVariantAwareTitle(
          'Bariatric Reclining Wheelchair w/ ELR 15015-24DELR (15015-24DELR)',
          wheelchair,
          { sku: '15015-24DELR' },
        ),
      ).toBe('Bariatric Reclining Wheelchair w/ ELR (15015-24DELR)')
    })

    it('takes the comma separator with it', () => {
      const chair = [{ sku: '10379' }, { sku: '10380' }]
      expect(
        resolveVariantAwareTitle('Bariatric HD Shower Chair, 10379 (10379)', chair, { sku: '10380' }),
      ).toBe('Bariatric HD Shower Chair (10380)')
    })

    it('removes a SKU whose size code would otherwise go stale too', () => {
      // "Blue 10743LG" — the LG is inside the SKU, so stripping the repeat
      // also removes a size that would contradict the selected variant.
      const slings = [{ sku: '10743LG' }, { sku: '10743XL' }]
      expect(
        resolveVariantAwareTitle('Divided Leg Sling, Blue 10743LG (10743LG)', slings, { sku: '10743XL' }),
      ).toBe('Divided Leg Sling, Blue (10743XL)')
    })

    it('strips the repeat for a truncated baked-in SKU too', () => {
      const trocars = [{ sku: 'B6705C' }, { sku: 'B7419C' }]
      expect(
        resolveVariantAwareTitle('Resin Trocar B6705 (B6705)', trocars, { sku: 'B7419C' }),
      ).toBe('Resin Trocar (B7419C)')
    })

    it('still strips when the selected variant has no SKU of its own', () => {
      expect(
        resolveVariantAwareTitle(
          'Bariatric Reclining Wheelchair w/ ELR 15015-24DELR (15015-24DELR)',
          wheelchair,
          { sku: null },
        ),
      ).toBe('Bariatric Reclining Wheelchair w/ ELR')
    })

    // Guards — the strip must stay narrow, because it runs catalog-wide.
    it('NEVER touches a mid-title model designation', () => {
      // 9501 Series must survive; only a TRAILING repeat is a repeat.
      const stools = [{ sku: '9501-AL' }, { sku: '9501-AR' }]
      expect(
        resolveVariantAwareTitle('9501 Series, Physician Stool (9501-AL)', stools, { sku: '9501-AR' }),
      ).toBe('9501 Series, Physician Stool (9501-AR)')
    })

    it('does not treat a longer code ending in the SKU as a repeat', () => {
      // "103790" ends with… no: the boundary check is on the char BEFORE the
      // match, so "X103790" must not be mistaken for a repeat of "103790".
      const v = [{ sku: '103790' }, { sku: '103791' }]
      expect(
        resolveVariantAwareTitle('Shower Chair X103790 (103790)', v, { sku: '103791' }),
      ).toBe('Shower Chair X103790 (103791)')
    })

    it('keeps the base title when the title was only ever the SKU', () => {
      const v = [{ sku: '10379' }, { sku: '10380' }]
      expect(resolveVariantAwareTitle('10379 (10379)', v, { sku: '10380' })).toBe('10379 (10380)')
    })

    it('keeps the base title when stripping would leave only punctuation', () => {
      const v = [{ sku: '10379' }, { sku: '10380' }]
      expect(resolveVariantAwareTitle('- 10379 (10379)', v, { sku: '10380' })).toBe('- 10379 (10380)')
    })

    it('leaves a clean title alone — no repeat, nothing stripped', () => {
      const v = [{ sku: 'URN-55323' }, { sku: 'URN-55327' }]
      expect(
        resolveVariantAwareTitle('Irrigation Probes Side Port Luer Lock, Blue (URN-55323)', v, { sku: 'URN-55327' }),
      ).toBe('Irrigation Probes Side Port Luer Lock, Blue (URN-55327)')
    })
  })
})
