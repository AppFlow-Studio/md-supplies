import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

const FILES = [
  'app/page.tsx',
  'app/category/[slug]/page.tsx',
  'app/category/[slug]/[product]/page.tsx',
  'app/product/[slug]/page.tsx',
  'app/industries/page.tsx',
  'app/blog/[handle]/page.tsx',
  'app/(noindex)/cart/page.tsx',
  'components/account/AccountView.tsx',
]

describe('every page <main> carries id="main-content" (skip-link target)', () => {
  for (const file of FILES) {
    it(`${file} has at least one <main id="main-content"`, () => {
      const src = read(file)
      const mainTags = src.match(/<main[^>]*>/g) ?? []
      expect(mainTags.length).toBeGreaterThan(0)
      for (const tag of mainTags) {
        expect(tag).toMatch(/id="main-content"/)
      }
    })
  }
})
