// __tests__/hero-lcp-opacity.test.ts
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { HeroSection } from '../components/home/HeroSection'

function readSource(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

const html = renderToStaticMarkup(createElement(HeroSection, { products: [] }))

describe('Homepage hero renders opaque in server HTML (LCP fix)', () => {
  it('server-rendered markup has no opacity:0 inline style', () => {
    expect(html).not.toMatch(/opacity:0/)
  })

  it('the hero H1 text is present in the server-rendered markup', () => {
    expect(html).toContain('Medical Supplies for')
  })

  it('HeroSection is a Server Component (no "use client" directive)', () => {
    const src = readSource('components/home/HeroSection.tsx')
    expect(src).not.toMatch(/^['"]use client['"]/m)
  })

  it('HeroSection no longer wraps above-the-fold content in FadeIn', () => {
    const src = readSource('components/home/HeroSection.tsx')
    expect(src).not.toMatch(/FadeIn/)
  })
})

describe('Below-the-fold homepage sections keep their fade-in entrance animation', () => {
  const sections = [
    'components/home/TrustedBrands.tsx',
    'components/home/ShopByIndustry.tsx',
    'components/home/PopularCategories.tsx',
    'components/home/PopularProducts.tsx',
    'components/home/WhyChooseUs.tsx',
  ]

  for (const file of sections) {
    it(`${file} still uses FadeIn`, () => {
      expect(readSource(file)).toMatch(/FadeIn/)
    })
  }
})
