import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('PDP section titles are real headings (Audit M13)', () => {
  const src = read('components/product/ProductView.tsx')

  it('renders "Item Number" as a heading', () => {
    expect(src).toMatch(/<h[1-6][^>]*>Item Number<\/h[1-6]>/)
  })

  it('renders "Brand Name" as a heading', () => {
    expect(src).toMatch(/<h[1-6][^>]*>Brand Name<\/h[1-6]>/)
  })

  it('renders "Description" as a heading', () => {
    expect(src).toMatch(/<h[1-6][^>]*>Description<\/h[1-6]>/)
  })

  it('renders "Specifications" as a heading', () => {
    expect(src).toMatch(/<h[1-6][^>]*>Specifications<\/h[1-6]>/)
  })
})

describe('PDP spec table uses row headers (Audit M13)', () => {
  const src = read('components/product/ProductView.tsx')

  it('uses <th scope="row"> for the spec-table label cell instead of <td>', () => {
    const specsBlock = src.slice(src.indexOf('SPEC_ROWS.map'), src.indexOf('/* Badges */'))
    expect(specsBlock).toMatch(/<th scope="row"[^>]*>\{label\}<\/th>/)
    expect(specsBlock).not.toMatch(/<td[^>]*>\{label\}<\/td>/)
  })
})
