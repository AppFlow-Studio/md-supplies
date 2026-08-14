import { describe, it, expect } from 'vitest'
import { SEARCH_PRODUCTS } from '../search'

describe('SEARCH_PRODUCTS variant.image (Quick Add fix, 2026-08-14)', () => {
  it('requests image on the selected variant', () => {
    expect(SEARCH_PRODUCTS).toMatch(/variants\(first: 1\) \{\s*nodes \{[\s\S]*?image \{/)
  })
})
