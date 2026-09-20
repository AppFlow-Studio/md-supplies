import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

const FILES = [
  'app/(site)/page.tsx',
  // /category/[slug] renders this shared view
  'components/category/CategoryPageView.tsx',
  'app/(site)/category/[slug]/[product]/page.tsx',
  'app/(site)/product/[slug]/page.tsx',
  'app/(site)/industries/page.tsx',
  'app/(site)/blog/[handle]/page.tsx',
  'app/(site)/(noindex)/cart/page.tsx',
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
