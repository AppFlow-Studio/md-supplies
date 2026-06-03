import { describe, it, expect } from 'vitest'
import { buildWebSiteSchema } from '../website'

describe('buildWebSiteSchema', () => {
  it('@context is https://schema.org', () => {
    expect(buildWebSiteSchema()['@context']).toBe('https://schema.org')
  })

  it('@type is WebSite', () => {
    expect(buildWebSiteSchema()['@type']).toBe('WebSite')
  })

  it('name is MDSupplies', () => {
    expect(buildWebSiteSchema().name).toBe('MDSupplies')
  })

  it('url is site root', () => {
    expect(buildWebSiteSchema().url).toBe('https://mdsupplies.com')
  })

  it('potentialAction @type is SearchAction', () => {
    expect(buildWebSiteSchema().potentialAction['@type']).toBe('SearchAction')
  })

  it('SearchAction urlTemplate points to /search?q=', () => {
    const schema = buildWebSiteSchema()
    expect(schema.potentialAction.target.urlTemplate).toBe(
      'https://mdsupplies.com/search?q={search_term_string}',
    )
  })

  it('query-input is required name=search_term_string', () => {
    expect(buildWebSiteSchema().potentialAction['query-input']).toBe(
      'required name=search_term_string',
    )
  })
})
