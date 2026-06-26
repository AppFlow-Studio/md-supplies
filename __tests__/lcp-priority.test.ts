import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('LCP-candidate images use priority loading', () => {
  it('homepage hero product images can be marked priority', () => {
    expect(read('components/home/HeroSection.tsx')).toMatch(/priority/)
  })

  it('PDP main gallery image is priority', () => {
    expect(read('components/product/ProductView.tsx')).toMatch(/priority/)
  })

  it('category hero banner image component is rendered above the fold without lazy', () => {
    const src = read('app/category/[slug]/page.tsx')
    expect(src).not.toMatch(/loading=["']lazy["'][\s\S]{0,80}CategoryImage/)
  })
})
