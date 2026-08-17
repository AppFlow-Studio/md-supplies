import { describe, it, expect } from 'vitest'
import { GET_COLLECTION_HERO, GET_COLLECTION } from '../collections'

describe('GET_COLLECTION_HERO', () => {
  it('fetches hero fields without touching the paginated products connection', () => {
    expect(GET_COLLECTION_HERO).toContain('descriptionHtml')
    expect(GET_COLLECTION_HERO).toContain('image { id url altText width height }')
    expect(GET_COLLECTION_HERO).not.toContain('products(')
    expect(GET_COLLECTION_HERO).not.toMatch(/\$first|\$after|\$sortKey|\$reverse|\$filters/)
  })
})

describe('GET_COLLECTION variant.image (Quick Add fix, 2026-08-14)', () => {
  it('requests image on each variant so Quick Add can switch its gallery per selection', () => {
    expect(GET_COLLECTION).toMatch(/variants\(first: 10\) \{\s*nodes \{[\s\S]*?image \{/)
  })
})
