import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ISR_ROUTE_FILES = [
  'app/page.tsx',
  'app/solutions/occ/page.tsx',
  'app/industries/[industry-slug]/page.tsx',
  'app/blog/[handle]/page.tsx',
]

// Fully dynamic since e167141: the root layout reads headers() for the CSP
// nonce, so these render per-request. Freshness is handled at the fetch layer
// (storefrontFetch cache tags + the Shopify webhook via app/api/revalidate),
// not by route-level ISR — a route-level `revalidate` export here would be
// dead config that misleads readers about how caching works.
const DYNAMIC_ROUTE_FILES = [
  'app/category/[slug]/page.tsx',
  'app/product/[slug]/page.tsx',
]

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('ISR: every data-fetching Track A/B route exports revalidate', () => {
  for (const file of ISR_ROUTE_FILES) {
    it(`${file} exports a numeric revalidate`, () => {
      expect(read(file)).toMatch(/export const revalidate = \d+/)
    })
  }
})

describe('dynamic routes: tag-invalidated pages do not carry dead ISR config', () => {
  for (const file of DYNAMIC_ROUTE_FILES) {
    it(`${file} does not export revalidate`, () => {
      expect(read(file)).not.toMatch(/export const revalidate/)
    })
  }
})
