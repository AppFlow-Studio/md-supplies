import { describe, it, expect } from 'vitest'
import { buildCollectionFlags, buildRoadmapCoverage, type AuditCollectionInput } from '../category-nav-audit'
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
