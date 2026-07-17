import { describe, it, expect } from 'vitest'
import { buildCollectionFlags, buildRoadmapCoverage, buildSurfaceReport, type AuditCollectionInput } from '../category-nav-audit'
import type { RoadmapCategory } from '../category-nav'

const ROADMAP: RoadmapCategory[] = [
  { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'], placeholderSlug: 'gloves' },
  { displayName: 'Apparel', navGroup: 'primary', matchedHandles: ['capes-gowns', 'footwear'], placeholderSlug: 'apparel' },
  { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: [], placeholderSlug: 'needles-syringes' },
]

function collection(overrides: Partial<AuditCollectionInput>): AuditCollectionInput {
  return {
    handle: 'placeholder',
    title: 'Placeholder',
    hasProduct: true,
    image: { url: 'https://example.com/img.jpg' },
    seo: { title: 'Title', description: 'Description' },
    ...overrides,
  }
}

describe('buildCollectionFlags', () => {
  it('flags a zero-product collection', () => {
    const flags = buildCollectionFlags([collection({ handle: 'gloves', hasProduct: false })], ROADMAP)
    expect(flags[0].zeroProduct).toBe(true)
  })

  it('flags missing image and missing SEO fields', () => {
    const flags = buildCollectionFlags(
      [collection({ handle: 'gloves', image: null, seo: { title: null, description: null } })],
      ROADMAP,
    )
    expect(flags[0].missingImage).toBe(true)
    expect(flags[0].missingSeoTitle).toBe(true)
    expect(flags[0].missingSeoDescription).toBe(true)
  })

  it('flags an excluded collection and does not also mark it an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'pharmaceuticals' })], ROADMAP)
    expect(flags[0].excluded).toBe(true)
    expect(flags[0].unmappedOrphan).toBe(false)
  })

  it('does not flag a roadmap-matched handle as an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'gloves' })], ROADMAP)
    expect(flags[0].unmappedOrphan).toBe(false)
  })

  it('does not flag a recognized subcategory (prefix match) as an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'gloves-nitrile' })], ROADMAP)
    expect(flags[0].unmappedOrphan).toBe(false)
  })

  it('flags a collection with no roadmap relationship as an orphan', () => {
    const flags = buildCollectionFlags([collection({ handle: 'random-collection' })], ROADMAP)
    expect(flags[0].unmappedOrphan).toBe(true)
  })
})

describe('buildRoadmapCoverage', () => {
  it('marks a single-handle category as mapped when present', () => {
    const coverage = buildRoadmapCoverage([{ handle: 'gloves' }], ROADMAP)
    expect(coverage.find((c) => c.displayName === 'Gloves')).toMatchObject({
      status: 'mapped',
      matchedHandles: ['gloves'],
    })
  })

  it('marks a multi-handle category as synthesized when at least one handle is present', () => {
    const coverage = buildRoadmapCoverage([{ handle: 'footwear' }], ROADMAP)
    expect(coverage.find((c) => c.displayName === 'Apparel')).toMatchObject({
      status: 'synthesized',
      matchedHandles: ['footwear'],
    })
  })

  it('marks a category with zero live matches as unmapped', () => {
    const coverage = buildRoadmapCoverage([{ handle: 'gloves' }], ROADMAP)
    expect(coverage.find((c) => c.displayName === 'Needles & Syringes')).toMatchObject({
      status: 'unmapped',
      matchedHandles: [],
    })
  })
})

describe('buildSurfaceReport', () => {
  const SURFACE_ROADMAP: RoadmapCategory[] = [
    { displayName: 'Gloves', navGroup: 'primary', matchedHandles: ['gloves'], placeholderSlug: 'gloves' },
    { displayName: 'Apparel', navGroup: 'primary', matchedHandles: ['capes-gowns', 'footwear'], placeholderSlug: 'apparel' },
    { displayName: 'Home Care', navGroup: 'more', matchedHandles: ['home-care'], placeholderSlug: 'home-care' },
    { displayName: 'Needles & Syringes', navGroup: 'primary', matchedHandles: ['needles-syringes'], placeholderSlug: 'needles-syringes' },
  ]

  const SURFACE_COLLECTIONS: AuditCollectionInput[] = [
    collection({ handle: 'gloves' }),
    collection({ handle: 'capes-gowns' }),
    collection({ handle: 'footwear' }),
    collection({ handle: 'home-care' }),
    collection({ handle: 'orphan-handle' }),      // not in roadmap
    collection({ handle: 'pharmaceuticals' }),    // excluded
    // needles-syringes is missing (unmapped)
  ]

  it('navPrimary contains registry L1 handles only (nav is tag-backbone driven)', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.navPrimary).toContain('gloves')
    // Nav no longer synthesizes multi-handle roadmap entries — apparel
    // sub-collections stay out of nav under the tag-backbone registry.
    expect(report.navPrimary).not.toContain('capes-gowns')
    expect(report.navPrimary).not.toContain('footwear')
    expect(report.navPrimary).not.toContain('needles-syringes') // not live
  })

  it('navMore contains live more-group category handles', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.navMore).toContain('home-care')
  })

  it('hubAll contains all live allowed handles including synthesized sub-handles', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.hubAll).toContain('gloves')
    expect(report.hubAll).toContain('capes-gowns')
    expect(report.hubAll).toContain('footwear') // second synthesized handle — in hub, not nav
    expect(report.hubAll).not.toContain('orphan-handle')
    expect(report.hubAll).not.toContain('pharmaceuticals')
  })

  it('orphanHandles lists live collections not in any roadmap handle and not excluded', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.orphanHandles).toContain('orphan-handle')
    expect(report.orphanHandles).not.toContain('gloves')
    expect(report.orphanHandles).not.toContain('pharmaceuticals')
  })

  it('hubOnlyHandles are roadmap-matched handles absent from the registry nav (expected)', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.hubOnlyHandles).toContain('footwear')
    expect(report.hubOnlyHandles).toContain('capes-gowns') // no longer in nav
    expect(report.hubOnlyHandles).not.toContain('gloves')
  })

  it('actionItems lists roadmap categories with no live matching handle', () => {
    const report = buildSurfaceReport(SURFACE_COLLECTIONS, SURFACE_ROADMAP)
    expect(report.actionItems).toContain('Needles & Syringes')
    expect(report.actionItems).not.toContain('Gloves')
  })
})
