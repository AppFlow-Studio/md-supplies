import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROUTE_FILES = [
  'app/page.tsx',
  'app/category/[slug]/page.tsx',
  'app/product/[slug]/page.tsx',
  'app/solutions/occ/page.tsx',
  'app/industries/[industry-slug]/page.tsx',
  'app/blog/[handle]/page.tsx',
]

describe('ISR: every data-fetching Track A/B route exports revalidate', () => {
  for (const file of ROUTE_FILES) {
    it(`${file} exports a numeric revalidate`, () => {
      const src = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
      expect(src).toMatch(/export const revalidate = \d+/)
    })
  }
})
