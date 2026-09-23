import { describe, it, expect } from 'vitest'
import {
  findSizeToken,
  findVariantMergeCandidates,
  findMattressCoverEntries,
  type CatalogProductSummary,
} from '../variant-candidates'

describe('findSizeToken', () => {
  it('finds the old short-form sizes the original consolidation already recognized', () => {
    expect(findSizeToken('8 Mil Black XL 10-100/CS')?.canon).toBe('XL')
    expect(findSizeToken('8 Mil Black XXL 10-100/CS')?.canon).toBe('XXL')
    expect(findSizeToken('Dukal Coveralls 2XL')?.canon).toBe('XXL')
    expect(findSizeToken('Dukal Coveralls 3XL')?.canon).toBe('XXXL')
  })

  it('finds the exact full-word forms the postmortem named as missed (Shield Line)', () => {
    expect(findSizeToken('Shield Line Isolation Gown Extra Large')?.canon).toBe('XL')
    expect(findSizeToken('Shield Line Isolation Gown Extra Extra Large')?.canon).toBe('XXL')
  })

  it('prefers the longer phrase so "Extra Extra Large" is not read as a bare "Large"', () => {
    expect(findSizeToken('Shield Line Gown Extra Extra Large')?.canon).toBe('XXL')
  })

  it('catches the Dukal coveralls/lab coats XXXL gap the postmortem also flagged', () => {
    expect(findSizeToken('Dukal Coveralls Extra Extra Extra Large')?.canon).toBe('XXXL')
    expect(findSizeToken('Dukal Coveralls XXX-Large')?.canon).toBe('XXXL')
  })

  it('does not match on a bare single letter (too ambiguous in free-text titles)', () => {
    expect(findSizeToken('SR-OX2051CA-3SR-OX2051CA')).toBeNull()
  })

  it('returns null when no size word is present', () => {
    expect(findSizeToken('Alcohol Prep Pad')).toBeNull()
  })
})

describe('findVariantMergeCandidates', () => {
  function product(handle: string, title: string, vendor = 'Shield Line'): CatalogProductSummary {
    return { handle, title, vendor, tags: [] }
  }

  it('groups short-form and full-word size siblings from the same vendor (the exact bug class)', () => {
    const products = [
      product('gown-small', 'Shield Line Isolation Gown Small'),
      product('gown-medium', 'Shield Line Isolation Gown Medium'),
      product('gown-xl', 'Shield Line Isolation Gown Extra Large'),
      product('gown-xxl', 'Shield Line Isolation Gown Extra Extra Large'),
    ]
    const groups = findVariantMergeCandidates(products)
    expect(groups).toHaveLength(1)
    expect(groups[0].members.map((m) => m.handle).sort()).toEqual([
      'gown-medium',
      'gown-small',
      'gown-xl',
      'gown-xxl',
    ])
    expect(new Set(groups[0].members.map((m) => m.size))).toEqual(new Set(['S', 'M', 'XL', 'XXL']))
  })

  it('groups the Dukal XXXL-omission pattern', () => {
    const products = [
      product('coverall-l', 'Dukal Coveralls Large', 'Dukal'),
      product('coverall-xl', 'Dukal Coveralls Extra Large', 'Dukal'),
      product('coverall-xxl', 'Dukal Coveralls Extra Extra Large', 'Dukal'),
      product('coverall-xxxl', 'Dukal Coveralls XXXL', 'Dukal'),
    ]
    const groups = findVariantMergeCandidates(products)
    expect(groups).toHaveLength(1)
    expect(groups[0].members).toHaveLength(4)
  })

  // Regression fixture from data/shipping-facts-v3.json: Graham Field's
  // "-lg-" finger cots product's TITLE never states a size at all ("FINGER
  // COTS LTX 144 NOT4EXAM GRAFCO, 144EA/BX"), only its handle and SKU do,
  // while the Med/XL siblings' titles do state theirs. Confirms the
  // handle-fallback path groups it with its siblings instead of silently
  // dropping it because its title has no strippable size phrase.
  it('falls back to the handle when a real vendor title omits the size word entirely', () => {
    const products = [
      product(
        'finger-cots-ltx-lg-144-not4exam-grafco-144ea-bx',
        'FINGER COTS LTX 144 NOT4EXAM GRAFCO, 144EA/BX',
        'Graham Field',
      ),
      product(
        'finger-cots-ltx-med-144-not4exam-grafco-144ea-bx',
        'FINGER COTS LTX MED 144 NOT4EXAM GRAFCO, 144EA/BX',
        'Graham Field',
      ),
      product(
        'finger-cots-ltx-xlg-144-not4exam-grafco-144ea-bx',
        'FINGER COTS LTX XLG 144 NOT4EXAM GRAFCO, 144EA/BX',
        'Graham Field',
      ),
    ]
    const groups = findVariantMergeCandidates(products)
    expect(groups).toHaveLength(1)
    const lgMember = groups[0].members.find((m) => m.handle.includes('-lg-'))
    expect(lgMember?.size).toBe('L')
    expect(lgMember?.sizeSource).toBe('handle')
  })

  it('does not group across different vendors even with an identical base title', () => {
    const products = [
      product('a-small', 'Isolation Gown Small', 'Vendor A'),
      product('b-large', 'Isolation Gown Large', 'Vendor B'),
    ]
    expect(findVariantMergeCandidates(products)).toEqual([])
  })

  it('does not flag a lone product with no sibling', () => {
    const products = [product('gown-small', 'Shield Line Isolation Gown Small')]
    expect(findVariantMergeCandidates(products)).toEqual([])
  })

  it('does not flag two listings of the same size (a different question than this bug class)', () => {
    const products = [
      product('gown-small-a', 'Shield Line Isolation Gown Small'),
      product('gown-small-b', 'Shield Line Isolation Gown Small'),
    ]
    expect(findVariantMergeCandidates(products)).toEqual([])
  })

  it('does not flag two products with no size word at all', () => {
    const products = [
      product('pad-a', 'Alcohol Prep Pad', 'Dukal'),
      product('pad-b', 'Gauze Sponge', 'Dukal'),
    ]
    expect(findVariantMergeCandidates(products)).toEqual([])
  })
})

describe('findMattressCoverEntries', () => {
  it('finds a mattress-cover product regardless of case', () => {
    const products: CatalogProductSummary[] = [
      { handle: 'a', title: 'Universal MATTRESS COVER 36x80x6', vendor: 'V', tags: ['category:room-furniture'] },
      { handle: 'b', title: 'Alcohol Prep Pad', vendor: 'V', tags: [] },
    ]
    expect(findMattressCoverEntries(products)).toEqual([
      { handle: 'a', title: 'Universal MATTRESS COVER 36x80x6', tags: ['category:room-furniture'], taggedFingerCots: false },
    ])
  })

  it('flags when a mattress-cover product actually carries the finger-cots subcategory tag', () => {
    const products: CatalogProductSummary[] = [
      {
        handle: 'a',
        title: 'Universal Mattress Cover',
        vendor: 'V',
        tags: ['category:gloves', 'subcategory:finger-cots'],
      },
    ]
    expect(findMattressCoverEntries(products)[0].taggedFingerCots).toBe(true)
  })
})
