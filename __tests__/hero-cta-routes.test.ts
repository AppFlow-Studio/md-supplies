import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { HeroSection } from '../components/home/HeroSection'

const html = renderToStaticMarkup(createElement(HeroSection, { products: [] }))

describe('HeroSection hero CTAs resolve to canonical, live routes', () => {
  it('"Shop All Products" points to /categories, not the 404ing /products', () => {
    expect(html).toContain('href="/categories"')
    expect(html).not.toContain('href="/products"')
  })

  it('"Shop OCC" points to /solutions/occ, not the 404ing /occ', () => {
    expect(html).toContain('href="/solutions/occ"')
    expect(html).not.toContain('href="/occ"')
  })

  it('both CTA targets have a real app route (page.tsx) backing them', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../app/categories/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.resolve(__dirname, '../app/solutions/occ/page.tsx'))).toBe(true)
  })

  it('renders a single H1 for the hero heading', () => {
    expect(html.match(/<h1[ >]/g)?.length).toBe(1)
  })
})
