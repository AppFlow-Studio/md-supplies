import { describe, it, expect } from 'vitest'
import {
  parseProductTags,
  CATEGORY_TREE_L1,
  FEATURED_SUBCATEGORIES,
  getFeaturedSubcategoryBySlug,
  getFeaturedSubcategoriesForParent,
  getCategorySlug,
} from '../category-tree'

describe('parseProductTags', () => {
  it('splits category: and subcategory: tags from the rest', () => {
    const result = parseProductTags([
      'brand:dynarex',
      'category:mobility',
      'industry:home-care',
      'subcategory:transport-chairs',
      'subcategory:manual-wheelchairs-18',
    ])
    expect(result.categories).toEqual(['mobility'])
    expect(result.subcategories).toEqual(['transport-chairs', 'manual-wheelchairs-18'])
  })

  it('returns empty arrays when no namespaced tags are present', () => {
    expect(parseProductTags(['brand:dukal', 'shipping:free'])).toEqual({
      categories: [],
      subcategories: [],
    })
  })

  it('preserves multiple category: tags in order (dual-tag products)', () => {
    const result = parseProductTags(['category:home-care', 'category:mobility'])
    expect(result.categories).toEqual(['home-care', 'mobility'])
  })
})

describe('CATEGORY_TREE_L1', () => {
  it('has exactly 25 confirmed-live approved L1 categories, each with a unique tag', () => {
    expect(CATEGORY_TREE_L1).toHaveLength(25)
    const tags = CATEGORY_TREE_L1.map((c) => c.tag)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('includes exam-room and dental (sanity-check anchors from the live pull)', () => {
    const tags = CATEGORY_TREE_L1.map((c) => c.tag)
    expect(tags).toContain('exam-room')
    expect(tags).toContain('dental')
  })
})

describe('CATEGORY_TREE_L1 short descriptions (DEV-LAUNCH-03)', () => {
  // Approved launch copy, verbatim, from the DEV-LAUNCH-03 ticket's Appendix A.
  // Keyed by registry `tag` — NOT by `collectionHandle` (Testing's tag is
  // `testing`; `testing-screening` is only the Shopify collection handle).
  const APPROVED_SHORT_DESCRIPTIONS: Record<string, string> = {
    'gloves': 'Exam and procedure gloves in nitrile, latex, and vinyl options for clinical, laboratory, and facility use.',
    'wound-care': 'Dressings, gauze, bandages, tapes, irrigation supplies, and other essentials for routine wound care.',
    'needles-syringes': 'Needles, syringes, and injection accessories in a range of gauges, sizes, and safety configurations.',
    'surgical-sutures': 'Absorbable and non-absorbable sutures, needles, and wound-closure supplies for clinical procedures.',
    'testing': 'Diagnostic, screening, specimen-collection, and point-of-care testing supplies for healthcare settings.',
    'exam-room': 'Everyday exam-room equipment and supplies, including tables, stools, lighting, and patient-care essentials.',
    'respiratory': 'Respiratory-care supplies for oxygen delivery, nebulization, airway support, and routine patient treatment.',
    'mobility': 'Wheelchairs, walkers, canes, rollators, and mobility accessories for patient support and daily movement.',
    'patient-therapy-rehab': 'Therapy, rehabilitation, exercise, and positioning products that support recovery and patient mobility.',
    'surgery-procedure': 'Procedure-room instruments, kits, trays, and accessories for minor surgery and clinical procedures.',
    'apparel': 'Medical apparel, gowns, caps, footwear, scrubs, and protective clothing for healthcare teams and patients.',
    'hygiene': 'Personal-hygiene and patient-care products for bathing, oral care, grooming, and everyday cleanliness.',
    'disinfectants': 'Cleaning and disinfection products for surfaces, equipment, hands, and infection-control routines.',
    'home-care': 'Practical medical and personal-care supplies designed for patients, caregivers, and home-health use.',
    'emergency-supplies': 'First-aid, trauma, rescue, and emergency-response supplies for clinics, facilities, and mobile teams.',
    'incontinence': 'Briefs, underpads, liners, wipes, and related products for dependable incontinence and skin care.',
    'iv-therapy': 'IV administration, infusion, access, and securement supplies for clinical fluid and medication delivery.',
    'urology-ostomy': 'Catheters, drainage, ostomy, and related accessories for urological and ostomy care.',
    'sterilization': 'Sterilization pouches, wraps, indicators, cleaners, and accessories for instrument-processing workflows.',
    'dental': 'Dental procedure, examination, infection-control, and patient-care supplies for dental practices.',
    'housekeeping-janitorial': 'Facility-cleaning, waste-handling, paper, and janitorial supplies for healthcare environments.',
    'bariatric': 'Bariatric patient-care and mobility equipment designed for higher weight capacities and added support.',
    'room-furniture': 'Seating, exam tables, cabinets, and room furnishings for treatment, consultation, and patient-care spaces.',
    'face-masks': 'Procedure masks, respirators, and face coverings for clinical, facility, and everyday protective use.',
    'pharmacy-products': 'Dispensing, labeling, packaging, counting, and patient-use supplies for pharmacy operations.',
  }

  it('has a nonempty, non-placeholder, HTML-free shortDescription for every one of the 25 approved categories', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      expect(l1.shortDescription, `${l1.tag} is missing a shortDescription`).toBeTruthy()
      expect(l1.shortDescription.trim().length, `${l1.tag} shortDescription is blank`).toBeGreaterThan(0)
      expect(l1.shortDescription, `${l1.tag} shortDescription contains raw HTML`).not.toMatch(/[<>]/)
    }
  })

  it('has exactly the approved verbatim copy for every tag (client-liability launch copy)', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      const approved = APPROVED_SHORT_DESCRIPTIONS[l1.tag]
      expect(approved, `${l1.tag} has no approved copy in the test's approved-copy table`).toBeDefined()
      expect(l1.shortDescription).toBe(approved)
    }
  })

  it('has no duplicated description text across categories', () => {
    const descriptions = CATEGORY_TREE_L1.map((l1) => l1.shortDescription)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })
})

describe('CATEGORY_TREE_L1 productSet (Bilal, 2026-08-20 — Trocar reversal)', () => {
  it('surgery-procedure (Trocar) is collection-sourced, not tag-sourced — shows Izzy\'s verified 41 active products, not the 319-product tag set', () => {
    const trocar = CATEGORY_TREE_L1.find((c) => c.tag === 'surgery-procedure')
    expect(trocar?.productSet).not.toBe('tag')
  })

  it('the other three productSet:"tag" categories are unchanged by the Trocar reversal', () => {
    const stillTagSourced = CATEGORY_TREE_L1.filter((c) => c.productSet === 'tag').map((c) => c.tag)
    expect(stillTagSourced.sort()).toEqual(['apparel', 'face-masks', 'room-furniture'])
  })
})

// ── P0.5 / P0.6: Surgery & Procedure and Trocars are two distinct pages ──────
//
// The defect these lock down: ONE registry row carried
// `tag: 'surgery-procedure'` with `collectionHandle: 'trocars-trocar-kits'`.
// Because collectionHandle is simultaneously the route slug, the artwork key
// and the product source, that single value meant /category/surgery-procedure
// did not exist and /category/trocars-trocar-kits announced itself as
// "Surgery & Procedure".
describe('Surgery & Procedure vs Trocars route split (P0.5/P0.6)', () => {
  const surgery = CATEGORY_TREE_L1.find((c) => c.tag === 'surgery-procedure')

  it('the Surgery & Procedure L1 points at its OWN broad collection', () => {
    expect(surgery).toBeDefined()
    expect(surgery!.collectionHandle).toBe('surgery-procedure')
    expect(surgery!.displayName).toBe('Surgery & Procedure')
  })

  it('no L1 category is backed by the Trocar collection', () => {
    const handles = CATEGORY_TREE_L1.map((c) => c.collectionHandle)
    expect(handles).not.toContain('trocars-trocar-kits')
  })

  it('resolves /category/surgery-procedure to the Surgery L1, never to Trocars', () => {
    const l1 = getL1ByCollectionHandle('surgery-procedure')
    expect(l1?.tag).toBe('surgery-procedure')
    expect(l1?.displayName).toBe('Surgery & Procedure')
  })

  it('does NOT resolve the Trocar route to an L1 — it is a featured subcategory', () => {
    expect(getL1ByCollectionHandle('trocars-trocar-kits')).toBeUndefined()
    expect(getFeaturedSubcategoryBySlug('trocars-trocar-kits')?.displayName).toBe('Trocars & Trocar Kits')
  })

  it('the two routes have different public slugs', () => {
    expect(getCategorySlug(surgery!)).toBe('surgery-procedure')
    expect(getFeaturedSubcategoryBySlug('trocars-trocar-kits')!.slug).toBe('trocars-trocar-kits')
    expect(getCategorySlug(surgery!)).not.toBe(getFeaturedSubcategoryBySlug('trocars-trocar-kits')!.slug)
  })

  it('files Trocars under Surgery & Procedure', () => {
    const children = getFeaturedSubcategoriesForParent('surgery-procedure')
    expect(children.map((c) => c.slug)).toEqual(['trocars-trocar-kits'])
  })

  it('every featured subcategory names a parent that exists in the L1 registry', () => {
    const tags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
    for (const sub of FEATURED_SUBCATEGORIES) {
      expect(tags.has(sub.parentTag), `${sub.slug} has an unknown parent ${sub.parentTag}`).toBe(true)
    }
  })

  it('no featured subcategory collides with an L1 slug or another featured slug', () => {
    const l1Slugs = CATEGORY_TREE_L1.map((c) => getCategorySlug(c))
    const featuredSlugs = FEATURED_SUBCATEGORIES.map((s) => s.slug)
    expect(new Set(featuredSlugs).size).toBe(featuredSlugs.length)
    for (const slug of featuredSlugs) {
      expect(l1Slugs, `${slug} shadows an L1 route`).not.toContain(slug)
    }
  })

  it('gives every featured subcategory its own truthful, HTML-free copy', () => {
    for (const sub of FEATURED_SUBCATEGORIES) {
      expect(sub.shortDescription.trim().length).toBeGreaterThan(0)
      expect(sub.shortDescription).not.toMatch(/[<>]/)
      expect(sub.imageAlt.trim().length).toBeGreaterThan(0)
      // The alt describes THIS page, never the parent whose artwork it reuses.
      expect(sub.imageAlt.toLowerCase()).not.toContain('surgery and procedure')
    }
  })

  it('makes no regulatory, shipping or clinical-outcome claim in featured copy', () => {
    // The Shopify collection's own seo.title asserts "FDA Registered"; that
    // claim must not be restated in copy this repo controls.
    const FORBIDDEN = /\b(FDA|CE marked|510\(k\)|sterile guarantee|free shipping|cures?|treats?)\b/i
    for (const sub of FEATURED_SUBCATEGORIES) {
      expect(sub.shortDescription).not.toMatch(FORBIDDEN)
    }
  })
})

import { resolveCanonicalCategory, buildL1Tiles } from '../category-tree'

describe('resolveCanonicalCategory', () => {
  it('returns the single category for a normally-tagged product', () => {
    expect(resolveCanonicalCategory({ handle: 'foo', categories: ['gloves'], subcategories: [] })).toBe('gloves')
  })

  it('returns null when a product has no category: tag at all', () => {
    expect(resolveCanonicalCategory({ handle: 'foo', categories: [], subcategories: [] })).toBeNull()
  })

  it('applies the hardcoded override for the 5 dual-tag exception products', () => {
    expect(
      resolveCanonicalCategory({
        handle: 'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs',
        categories: ['home-care', 'mobility'],
        subcategories: ['transport-chairs'],
      }),
    ).toBe('mobility')
  })

  it('falls back to the first category: tag for an un-overridden dual-tag product', () => {
    expect(
      resolveCanonicalCategory({ handle: 'some-other-handle', categories: ['home-care', 'mobility'], subcategories: [] }),
    ).toBe('home-care')
  })
})

describe('buildL1Tiles', () => {
  it('counts products per L1 tag, zero for tags with no matching products', () => {
    const tiles = buildL1Tiles([
      { handle: 'a', categories: ['gloves'], subcategories: [] },
      { handle: 'b', categories: ['gloves'], subcategories: [] },
      { handle: 'c', categories: ['dental'], subcategories: [] },
    ])
    const gloves = tiles.find((t) => t.tag === 'gloves')!
    const dental = tiles.find((t) => t.tag === 'dental')!
    const wound = tiles.find((t) => t.tag === 'wound-care')!
    expect(gloves.productCount).toBe(2)
    expect(dental.productCount).toBe(1)
    expect(wound.productCount).toBe(0)
    expect(tiles).toHaveLength(25)
  })

  it('ignores products whose category: tag is not in the L1 allowlist (noise tags)', () => {
    const tiles = buildL1Tiles([
      { handle: 'a', categories: ['non-medical'], subcategories: [] },
    ])
    expect(tiles.every((t) => t.productCount === 0)).toBe(true)
  })

  it('routes the override products into their canonical L1 count instead of their first raw tag', () => {
    const tiles = buildL1Tiles([
      {
        handle: 'dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs',
        categories: ['home-care', 'mobility'],
        subcategories: ['transport-chairs'],
      },
    ])
    expect(tiles.find((t) => t.tag === 'mobility')!.productCount).toBe(1)
    expect(tiles.find((t) => t.tag === 'home-care')!.productCount).toBe(0)
  })
})

import { buildL2Tree, isAttributeSubcategoryTag } from '../category-tree'

describe('isAttributeSubcategoryTag', () => {
  it('matches gauge-prefixed needle/lancet/catheter tags', () => {
    expect(isAttributeSubcategoryTag('25g-hypodermic-needles')).toBe(true)
    expect(isAttributeSubcategoryTag('21g-lancets')).toBe(true)
    expect(isAttributeSubcategoryTag('20g-iv-catheters')).toBe(true)
    expect(isAttributeSubcategoryTag('23g-dental-needles')).toBe(true)
  })

  it('matches suture-gauge tags, including the bare "0-sutures" case', () => {
    expect(isAttributeSubcategoryTag('4-0-sutures')).toBe(true)
    expect(isAttributeSubcategoryTag('3-0-sutures')).toBe(true)
    expect(isAttributeSubcategoryTag('0-sutures')).toBe(true)
  })

  it('matches cc-volume syringe tags', () => {
    expect(isAttributeSubcategoryTag('3cc-syringe')).toBe(true)
    expect(isAttributeSubcategoryTag('10cc-syringe')).toBe(true)
  })

  it('matches manual-wheelchairs width-suffixed tags', () => {
    expect(isAttributeSubcategoryTag('manual-wheelchairs-20')).toBe(true)
    expect(isAttributeSubcategoryTag('manual-wheelchairs-18')).toBe(true)
  })

  it('matches gal-volume sharps tags', () => {
    expect(isAttributeSubcategoryTag('2-gal-sharps')).toBe(true)
  })

  it('does not match real subcategory tags that happen to contain a digit', () => {
    expect(isAttributeSubcategoryTag('12-panel')).toBe(false)
    expect(isAttributeSubcategoryTag('exam-gloves')).toBe(false)
    expect(isAttributeSubcategoryTag('bariatric-wheelchairs')).toBe(false)
  })
})

describe('buildL2Tree', () => {
  it('nests a subcategory under its single co-occurring L1 category', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['gloves'], subcategories: ['exam-gloves'] },
      { handle: 'b', categories: ['gloves'], subcategories: ['exam-gloves'] },
    ])
    const examGloves = nodes.find((n) => n.tag === 'exam-gloves')!
    expect(examGloves.parentTag).toBe('gloves')
    expect(examGloves.crossLinkParentTag).toBeUndefined()
    expect(examGloves.productCount).toBe(2)
  })

  it('applies the 3 hardcoded boundary overrides regardless of raw dominance', () => {
    // exam-tables: live counts favor exam-room (16) over room-furniture (12) —
    // the override deliberately picks room-furniture as canonical anyway.
    const nodes = buildL2Tree([
      ...Array.from({ length: 16 }, (_, i) => ({
        handle: `er-${i}`, categories: ['exam-room'], subcategories: ['exam-tables'],
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        handle: `rf-${i}`, categories: ['room-furniture'], subcategories: ['exam-tables'],
      })),
    ])
    const examTables = nodes.find((n) => n.tag === 'exam-tables')!
    expect(examTables.parentTag).toBe('room-furniture')
    expect(examTables.crossLinkParentTag).toBe('exam-room')
    expect(examTables.productCount).toBe(28)
  })

  it('defaults un-overridden boundary subcategories to the dominant co-occurring parent', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['exam-room'], subcategories: ['foot-stools'] },
      { handle: 'b', categories: ['exam-room'], subcategories: ['foot-stools'] },
      { handle: 'c', categories: ['home-care'], subcategories: ['foot-stools'] },
    ])
    const footStools = nodes.find((n) => n.tag === 'foot-stools')!
    expect(footStools.parentTag).toBe('exam-room')
    expect(footStools.crossLinkParentTag).toBeUndefined()
  })

  it('excludes a subcategory whose only co-occurring category: tags are not approved L1s', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['non-medical'], subcategories: ['pet-pads'] },
    ])
    expect(nodes.find((n) => n.tag === 'pet-pads')).toBeUndefined()
  })

  it('excludes attribute-patterned subcategory tags from ever producing a node', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['needles-syringes'], subcategories: ['25g-hypodermic-needles'] },
    ])
    expect(nodes.find((n) => n.tag === '25g-hypodermic-needles')).toBeUndefined()
  })

  it('builds a node only for the real tag when a product carries both a real and an attribute-patterned subcategory tag', () => {
    const nodes = buildL2Tree([
      { handle: 'a', categories: ['surgical-sutures'], subcategories: ['sutures', '4-0-sutures'] },
    ])
    expect(nodes.find((n) => n.tag === 'sutures')).toBeDefined()
    expect(nodes.find((n) => n.tag === '4-0-sutures')).toBeUndefined()
  })
})

import {
  getL1ByCollectionHandle,
  humanizeTag,
  buildSubcategoryTagQuery,
  getSubcategoriesForParent,
  getProductCategoryPath,
} from '../category-tree'

describe('getL1ByCollectionHandle', () => {
  it('finds an L1 whose collectionHandle differs from its tag', () => {
    const l1 = getL1ByCollectionHandle('testing-screening')
    expect(l1?.tag).toBe('testing')
  })

  it('finds an L1 whose collectionHandle matches its tag', () => {
    const l1 = getL1ByCollectionHandle('gloves')
    expect(l1?.tag).toBe('gloves')
  })

  it('returns undefined for an unknown handle', () => {
    expect(getL1ByCollectionHandle('not-a-real-handle')).toBeUndefined()
  })
})

describe('humanizeTag', () => {
  it('title-cases a kebab-case tag', () => {
    expect(humanizeTag('exam-gloves')).toBe('Exam Gloves')
  })

  it('handles a single-word tag', () => {
    expect(humanizeTag('sutures')).toBe('Sutures')
  })
})

describe('buildSubcategoryTagQuery', () => {
  it('combines category and subcategory tags into a Storefront query string', () => {
    expect(buildSubcategoryTagQuery('needles-syringes', 'iv-catheters')).toBe(
      'tag:"category:needles-syringes" AND tag:"subcategory:iv-catheters"',
    )
  })
})

describe('getSubcategoriesForParent', () => {
  it('returns only nodes whose parentTag matches, excluding a given tag', () => {
    const l2Nodes = [
      { tag: 'exam-gloves', parentTag: 'gloves', productCount: 10 },
      { tag: 'surgical-gloves', parentTag: 'gloves', productCount: 5 },
      { tag: 'wound-dressings', parentTag: 'wound-care', productCount: 8 },
    ]
    const result = getSubcategoriesForParent('gloves', l2Nodes)
    expect(result.map((n) => n.tag).sort()).toEqual(['exam-gloves', 'surgical-gloves'])
  })
})

describe('getProductCategoryPath', () => {
  const l2Nodes = [
    { tag: 'exam-tables', parentTag: 'room-furniture', crossLinkParentTag: 'exam-room', productCount: 28 },
    { tag: 'exam-gloves', parentTag: 'gloves', productCount: 10 },
  ]

  it('resolves category and subcategory from the product\'s own canonical tags', () => {
    const path = getProductCategoryPath(
      { handle: 'some-glove', categories: ['gloves'], subcategories: ['exam-gloves'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('gloves')
    expect(path?.subcategory?.tag).toBe('exam-gloves')
  })

  it('always resolves to the canonical parent for a boundary subcategory, never the cross-link parent', () => {
    const path = getProductCategoryPath(
      { handle: 'some-exam-table', categories: ['room-furniture'], subcategories: ['exam-tables'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('room-furniture')
    expect(path?.subcategory?.tag).toBe('exam-tables')
  })

  it('returns a null subcategory when the product carries no matching subcategory tag', () => {
    const path = getProductCategoryPath(
      { handle: 'some-glove', categories: ['gloves'], subcategories: [] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('gloves')
    expect(path?.subcategory).toBeNull()
  })

  it('returns null when the product has no resolvable category at all', () => {
    const path = getProductCategoryPath(
      { handle: 'untagged', categories: [], subcategories: [] },
      l2Nodes,
    )
    expect(path).toBeNull()
  })

  it('resolves to the canonical parent even when the product carries only the cross-link parent\'s raw category tag', () => {
    const path = getProductCategoryPath(
      { handle: 'some-exam-table-2', categories: ['exam-room'], subcategories: ['exam-tables'] },
      l2Nodes,
    )
    expect(path?.category.tag).toBe('room-furniture')
    expect(path?.subcategory?.tag).toBe('exam-tables')
  })
})

import { buildCategoryTreeNav } from '../category-tree'

describe('buildCategoryTreeNav', () => {
  it('splits entries into primary/more per navGroup', () => {
    const nav = buildCategoryTreeNav(CATEGORY_TREE_L1.map((l1) => ({ handle: l1.collectionHandle })))
    expect(nav.primary.some((e) => e.displayName === 'Gloves')).toBe(true)
    expect(nav.more.some((e) => e.displayName === 'Dental')).toBe(true)
    expect(nav.primary.some((e) => e.displayName === 'Dental')).toBe(false)
    expect(nav.more.some((e) => e.displayName === 'Gloves')).toBe(false)
  })

  it('skips an L1 whose collectionHandle has no matching live collection', () => {
    const nav = buildCategoryTreeNav([{ handle: 'not-a-real-handle' }])
    expect(nav.primary).toHaveLength(0)
    expect(nav.more).toHaveLength(0)
  })

  it('builds href via ROUTES.category(collectionHandle)', () => {
    const nav = buildCategoryTreeNav([{ handle: 'testing-screening' }])
    const testing = nav.primary.find((e) => e.displayName === 'Testing')
    expect(testing?.href).toBe('/category/testing-screening')
  })
})

import { getShopifyHandle, getAllowedHandles } from '../category-tree'

describe('getShopifyHandle', () => {
  it('resolves the canonical face-masks slug back to the real face-coverings handle', () => {
    expect(getShopifyHandle('face-masks')).toBe('face-coverings')
  })

  it('returns the input unchanged for a slug with no canonical alias', () => {
    expect(getShopifyHandle('mobility')).toBe('mobility')
    expect(getShopifyHandle('some-unrelated-slug')).toBe('some-unrelated-slug')
  })
})

describe('getAllowedHandles', () => {
  it('contains every L1 collection handle', () => {
    const allowed = getAllowedHandles()
    expect(allowed.has('mobility')).toBe(true)
    expect(allowed.has('home-care')).toBe(true)
    expect(allowed.has('gloves')).toBe(true)
  })

  it('contains every featured-subcategory collection handle', () => {
    expect(getAllowedHandles().has('trocars-trocar-kits')).toBe(true)
  })

  it('does not contain an arbitrary non-registry handle', () => {
    expect(getAllowedHandles().has('random-nonexistent')).toBe(false)
  })

  it('deliberately excludes legacy category-nav.ts sub-handles that have no standalone header-nav tile', () => {
    // The old lib/category-nav.ts allowlist flat-mapped every matchedHandles
    // entry across all categories (~36 handles), including sub-collections
    // like 'footwear' (under Apparel) and 'exam-tables' (under Room
    // Furniture). The new allowlist is CATEGORY_TREE_L1 collection handles +
    // FEATURED_SUBCATEGORIES only (26 handles) — exactly what
    // buildCategoryTreeNav links in the header/footer nav. Neither 'footwear'
    // nor 'exam-tables' has its own header nav entry (only the parent
    // Apparel / Room Furniture tile does), so predictive search — the only
    // live consumer of getAllowedHandles() — should not suggest them either.
    const allowed = getAllowedHandles()
    expect(allowed.has('footwear')).toBe(false)
    expect(allowed.has('exam-tables')).toBe(false)
  })
})