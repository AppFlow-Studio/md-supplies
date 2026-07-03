import { describe, it, expect } from 'vitest'
import { GET_COLLECTION_HERO } from '../collections'

describe('GET_COLLECTION_HERO', () => {
  it('fetches hero fields without touching the paginated products connection', () => {
    expect(GET_COLLECTION_HERO).toContain('descriptionHtml')
    expect(GET_COLLECTION_HERO).toContain('image { id url altText width height }')
    expect(GET_COLLECTION_HERO).not.toContain('products(')
    expect(GET_COLLECTION_HERO).not.toMatch(/\$first|\$after|\$sortKey|\$reverse|\$filters/)
  })
})
