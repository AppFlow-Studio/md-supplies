import { test } from '@playwright/test'
import fixtures from './qa-fixtures.json'

/**
 * Typed accessors over the QA-store snapshot bootstrapped by
 * scripts/qa-catalog-fixtures.ts (docs/launch/DEV-LAUNCH-06-qa-fixtures.md is
 * the human-readable twin of this same data). Real handles/GIDs from the QA
 * store, not production-specific IDs — see DEV-LAUNCH-06.
 *
 * QA store data can change between snapshot and test run, so every accessor
 * here that a test depends on for setup should be paired with
 * `test.skip(!fixture, reason)` rather than asserted — a missing fixture is a
 * QA-data gap to report, not a test failure to chase.
 */

type SampleProduct = { handle: string; gid: string }

type CategoryFixture = {
  tag: string
  collectionHandle: string
  routeSlug: string
  exists: boolean
  gid: string | null
  productCount: number
  sampleProducts: SampleProduct[]
}

type OccFixture = {
  handle: string
  exists: boolean
  gid: string | null
  productCount: number
  sampleProducts: SampleProduct[]
}

type IndustryFixture = {
  slug: string
  tag: string
  sampleCount: number
  sampleProducts: SampleProduct[]
}

const data = fixtures as {
  generatedAt: string
  storeDomain: string
  l1Categories: CategoryFixture[]
  occ: OccFixture
  industries: IndustryFixture[]
}

export function categoryFixture(tag: string): CategoryFixture | undefined {
  return data.l1Categories.find((c) => c.tag === tag)
}

/** First L1 category live on QA with enough products to span multiple pages
 *  (CATEGORY_PAGE_SIZE is 9 — 3x that guarantees at least a 3rd page). */
export function firstPaginatableCategory(minProducts = 27): CategoryFixture | undefined {
  return data.l1Categories.find((c) => c.exists && c.productCount >= minProducts)
}

export function firstPopulatedCategory(minProducts = 1): CategoryFixture | undefined {
  return data.l1Categories.find((c) => c.exists && c.productCount >= minProducts)
}

export function occFixture(): OccFixture {
  return data.occ
}

export function industryFixture(slug: string): IndustryFixture | undefined {
  return data.industries.find((i) => i.slug === slug)
}

export function firstPopulatedIndustry(): IndustryFixture | undefined {
  return data.industries.find((i) => i.sampleCount > 0)
}

/** Skips the current test with a clear QA-data-gap reason instead of failing
 *  red when a required fixture isn't present on the QA store right now. */
export function requireFixture<T>(fixture: T | undefined, description: string): T {
  test.skip(!fixture, `QA-data gap: ${description} — re-run scripts/qa-catalog-fixtures.ts to refresh`)
  return fixture as T
}

export const fixturesMeta = { generatedAt: data.generatedAt, storeDomain: data.storeDomain }
