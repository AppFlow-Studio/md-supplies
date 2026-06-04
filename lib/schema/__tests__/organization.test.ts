import { describe, it, expect } from 'vitest'
import { buildOrganizationSchema } from '../organization'

describe('buildOrganizationSchema', () => {
  it('@context is https://schema.org', () => {
    expect(buildOrganizationSchema()['@context']).toBe('https://schema.org')
  })

  it('@type is OnlineStore', () => {
    expect(buildOrganizationSchema()['@type']).toBe('OnlineStore')
  })

  it('name defaults to MDSupplies', () => {
    expect(buildOrganizationSchema().name).toBe('MDSupplies')
  })

  it('url defaults to https://mdsupplies.com', () => {
    expect(buildOrganizationSchema().url).toBe('https://mdsupplies.com')
  })
})
