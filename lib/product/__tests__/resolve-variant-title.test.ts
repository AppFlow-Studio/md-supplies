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

  // Izzy's 983-product report, 2026-09-23 (15015-24DELR): some titles bake the
  // same SKU in twice — inline AND parenthesised. Rewriting only the
  // parenthetical left the inline copy stale, producing a title that named one
  // SKU and parenthesised another.
  //
  // NOTE: an earlier pass asserted the inline repeat was STRIPPED. The agreed
  // contract is now REPLACE — every whole-token occurrence of the identified
  // baked-in SKU becomes the selected SKU. These expectations were updated to
  // the new contract deliberately, not relaxed to fit the implementation.
  describe('when the baked-in SKU is repeated inline as well as parenthesised', () => {
    const wheelchair = [{ sku: '15015-24DELR' }, { sku: '15015-26DELR' }, { sku: '15015-28DELR' }]
    const WHEELCHAIR_TITLE = 'Bariatric Reclining Wheelchair w/ ELR 15015-24DELR (15015-24DELR)'

    it('replaces BOTH occurrences with the selected SKU', () => {
      const out = resolveVariantAwareTitle(WHEELCHAIR_TITLE, wheelchair, { sku: '15015-26DELR' })
      expect(out).toBe('Bariatric Reclining Wheelchair w/ ELR 15015-26DELR (15015-26DELR)')
      expect(out).not.toContain('15015-24DELR')
    })

    it('leaves the title exactly as authored when the baked-in variant is selected', () => {
      expect(resolveVariantAwareTitle(WHEELCHAIR_TITLE, wheelchair, { sku: '15015-24DELR' }))
        .toBe(WHEELCHAIR_TITLE)
    })

    it('is idempotent — resolving an already-resolved title changes nothing', () => {
      const once = resolveVariantAwareTitle(WHEELCHAIR_TITLE, wheelchair, { sku: '15015-26DELR' })
      const twice = resolveVariantAwareTitle(once, wheelchair, { sku: '15015-26DELR' })
      expect(twice).toBe(once)
    })

    it('does not accumulate substitutions across A -> B -> C -> A', () => {
      const a = resolveVariantAwareTitle(WHEELCHAIR_TITLE, wheelchair, { sku: '15015-24DELR' })
      const b = resolveVariantAwareTitle(a, wheelchair, { sku: '15015-26DELR' })
      const c = resolveVariantAwareTitle(b, wheelchair, { sku: '15015-28DELR' })
      const backToA = resolveVariantAwareTitle(c, wheelchair, { sku: '15015-24DELR' })
      expect(backToA).toBe(WHEELCHAIR_TITLE)
      for (const out of [a, b, c, backToA]) {
        const present = wheelchair.map((v) => v.sku).filter((sku) => out.includes(sku))
        expect(present).toHaveLength(1)
      }
    })

    // The other nine duplicate-SKU products. Titles and SKUs are the
    // authoritative values from Izzy's report, not invented.
    it.each([
      ['Divided Leg Sling, Blue 10743LG (10743LG)', ['10743LG', '10743SM', '10743MD', '10743XL'], '10743XL',
        'Divided Leg Sling, Blue 10743XL (10743XL)'],
      ['Anti Thrust Wedge Cushion Gel, 10690 (10690)', ['10690', '10691'], '10691',
        'Anti Thrust Wedge Cushion Gel, 10691 (10691)'],
      ['Bariatric Air Cushion, 10670 (10670)', ['10670', '10671'], '10671',
        'Bariatric Air Cushion, 10671 (10671)'],
      ['Bariatric HD Full Electric Homecare Bed, 10405 (10405)', ['10405', '10403'], '10403',
        'Bariatric HD Full Electric Homecare Bed, 10403 (10403)'],
      ['Bariatric HD Shower Chair, 10379 (10379)', ['10379', '10380'], '10380',
        'Bariatric HD Shower Chair, 10380 (10380)'],
      ['Bariatric Plus Airfloat Air Mattress w/ Pump, 10445 (10445)', ['10445', '10446'], '10446',
        'Bariatric Plus Airfloat Air Mattress w/ Pump, 10446 (10446)'],
      ['Bariatric Plus Foam Mattress, 10431 (10431)', ['10431', '10432'], '10432',
        'Bariatric Plus Foam Mattress, 10432 (10432)'],
      ['Bedside Bi-Fold Foam Floor Mat, 13020 (13020)', ['13020', '13021'], '13021',
        'Bedside Bi-Fold Foam Floor Mat, 13021 (13021)'],
      ['Deluxe Sit-to-Stand Sling, Blue 10746LG (10746LG)', ['10746LG', '10746XL'], '10746XL',
        'Deluxe Sit-to-Stand Sling, Blue 10746XL (10746XL)'],
    ])('replaces every occurrence in %s', (title, skus, selected, expected) => {
      const vs = (skus as string[]).map((sku) => ({ sku }))
      const out = resolveVariantAwareTitle(title as string, vs, { sku: selected as string })
      expect(out).toBe(expected)
      const baked = (title as string).slice(
        (title as string).lastIndexOf('(') + 1,
        (title as string).lastIndexOf(')'),
      )
      if (baked !== selected) expect(out).not.toContain(baked)
    })

    it('replaces the repeat for a truncated baked-in SKU too', () => {
      const trocars = [{ sku: 'B6705C' }, { sku: 'B7419C' }]
      expect(resolveVariantAwareTitle('Resin Trocar B6705 (B6705)', trocars, { sku: 'B7419C' }))
        .toBe('Resin Trocar B7419C (B7419C)')
    })

    it('removes the baked-in code entirely when the selected variant has no SKU', () => {
      expect(resolveVariantAwareTitle(WHEELCHAIR_TITLE, wheelchair, { sku: null }))
        .toBe('Bariatric Reclining Wheelchair w/ ELR')
    })

    // ---- Guards. The replacement must stay token-exact. ----
    it('NEVER touches a mid-title model designation', () => {
      const stools = [{ sku: '9501-AL' }, { sku: '9501-AR' }]
      expect(resolveVariantAwareTitle('9501 Series, Physician Stool (9501-AL)', stools, { sku: '9501-AR' }))
        .toBe('9501 Series, Physician Stool (9501-AR)')
    })

    it('does not rewrite the SKU when it only appears inside a longer identifier', () => {
      const v = [{ sku: '10690' }, { sku: '10691' }]
      const out = resolveVariantAwareTitle('Cushion X10690A (10690)', v, { sku: '10691' })
      expect(out).toBe('Cushion X10690A (10691)')
      expect(out).toContain('X10690A')
    })

    it('treats dots and dashes in a SKU literally, not as regex wildcards', () => {
      const v = [{ sku: 'AB.CD-01' }, { sku: 'AB.CD-02' }]
      expect(resolveVariantAwareTitle('Kit AB.CD-01 (AB.CD-01)', v, { sku: 'AB.CD-02' }))
        .toBe('Kit AB.CD-02 (AB.CD-02)')
      // A regex-treated "." would also have matched "ABxCD-01"; prove it did not.
      expect(resolveVariantAwareTitle('Kit ABxCD-01 (AB.CD-01)', v, { sku: 'AB.CD-02' }))
        .toBe('Kit ABxCD-01 (AB.CD-02)')
    })

    it('does not throw on SKUs containing regex metacharacters', () => {
      const v = [{ sku: 'A+B*C' }, { sku: 'A+B*D' }]
      expect(() => resolveVariantAwareTitle('Widget A+B*C (A+B*C)', v, { sku: 'A+B*D' })).not.toThrow()
      expect(resolveVariantAwareTitle('Widget A+B*C (A+B*C)', v, { sku: 'A+B*D' }))
        .toBe('Widget A+B*D (A+B*D)')
    })

    it('is case-sensitive — a differently-cased token is a different token', () => {
      const v = [{ sku: 'abc-1' }, { sku: 'abc-2' }]
      expect(resolveVariantAwareTitle('Widget ABC-1 (abc-1)', v, { sku: 'abc-2' }))
        .toBe('Widget ABC-1 (abc-2)')
    })

    it('leaves a clean title alone — no repeat, nothing extra changed', () => {
      const v = [{ sku: 'URN-55323' }, { sku: 'URN-55327' }]
      expect(
        resolveVariantAwareTitle('Irrigation Probes Side Port Luer Lock, Blue (URN-55323)', v, { sku: 'URN-55327' }),
      ).toBe('Irrigation Probes Side Port Luer Lock, Blue (URN-55327)')
    })

    it('preserves an unrelated parenthetical while replacing the SKU one', () => {
      const gloves = [{ sku: 'HAL 44992' }, { sku: 'HAL 44995' }]
      const out = resolveVariantAwareTitle(
        'Purple Nitrile Max Powder-Free Exam Glove, 50/bx 8bx/cs (US Only) (HAL 44992)',
        gloves,
        { sku: 'HAL 44995' },
      )
      expect(out).toBe('Purple Nitrile Max Powder-Free Exam Glove, 50/bx 8bx/cs (US Only) (HAL 44995)')
      expect(out).toContain('(US Only)')
    })

    it('bails out safely on a template placeholder rather than guessing', () => {
      const stools = [{ sku: '9501-AL' }, { sku: '9501-AR' }, { sku: '9501-BL' }]
      const title = '9501 Series, Physician Stool, with Single Lever Release, Black Composite Base (9501-xx)'
      expect(resolveVariantAwareTitle(title, stools, { sku: '9501-AR' })).toBe(title)
    })

    it('leaves the title unchanged when no candidate matches at all', () => {
      const v = [{ sku: '113735' }, { sku: '113736' }]
      const title = 'Allergy Tray, TB Syringe, Case (8881500501)'
      expect(resolveVariantAwareTitle(title, v, { sku: '113736' })).toBe(title)
    })
  })
})
