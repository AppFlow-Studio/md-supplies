import { describe, it, expect } from 'vitest'
import { buildCollectionPageSchema } from '../collection'

const BASE_URL = 'https://mdsupplies.com/category/exam-gloves'

describe('buildCollectionPageSchema', () => {
  it('@context is https://schema.org', () => {
    expect(buildCollectionPageSchema({ name: 'Exam Gloves', url: BASE_URL })['@context']).toBe(
      'https://schema.org',
    )
  })

  it('@type is CollectionPage', () => {
    expect(buildCollectionPageSchema({ name: 'Exam Gloves', url: BASE_URL })['@type']).toBe(
      'CollectionPage',
    )
  })

  it('name is set from input', () => {
    expect(buildCollectionPageSchema({ name: 'Exam Gloves', url: BASE_URL }).name).toBe(
      'Exam Gloves',
    )
  })

  it('url is set from input', () => {
    expect(buildCollectionPageSchema({ name: 'Gloves', url: BASE_URL }).url).toBe(BASE_URL)
  })

  it('description is included when provided', () => {
    const schema = buildCollectionPageSchema({
      name: 'Gloves',
      url: BASE_URL,
      description: 'Wholesale exam gloves',
    })
    expect(schema.description).toBe('Wholesale exam gloves')
  })

  it('description is absent when not provided', () => {
    const schema = buildCollectionPageSchema({ name: 'Gloves', url: BASE_URL })
    expect('description' in schema).toBe(false)
  })

  it('image is included when provided', () => {
    const schema = buildCollectionPageSchema({
      name: 'Gloves',
      url: BASE_URL,
      image: 'https://cdn.example.com/gloves.jpg',
    })
    expect(schema.image).toBe('https://cdn.example.com/gloves.jpg')
  })

  it('image is absent when not provided', () => {
    const schema = buildCollectionPageSchema({ name: 'Gloves', url: BASE_URL })
    expect('image' in schema).toBe(false)
  })
})
