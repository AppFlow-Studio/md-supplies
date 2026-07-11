import { describe, it, expect, vi } from 'vitest'
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

describe('buildOrganizationSchema — NAP identity (M7/M12/M26/F2)', () => {
  it('always carries the canonical https LinkedIn as sameAs', () => {
    expect(buildOrganizationSchema().sameAs).toEqual([
      'https://www.linkedin.com/company/mdsupplies',
    ])
  })

  it('always carries a customer-support contactPoint with email', () => {
    const cp = buildOrganizationSchema().contactPoint
    expect(cp['@type']).toBe('ContactPoint')
    expect(cp.contactType).toBe('customer support')
    expect(cp.email).toBe('team@mdsupplies.com')
  })

  it('omits telephone and address while the real NAP is not filled in (never fabricates)', () => {
    const schema = buildOrganizationSchema() as Record<string, unknown>
    expect(schema.address).toBeUndefined()
    expect((schema.contactPoint as Record<string, unknown>).telephone).toBeUndefined()
  })
})

describe('buildOrganizationSchema — with real NAP filled in', () => {
  it('emits PostalAddress and telephone matching lib/site-contact', async () => {
    vi.resetModules()
    vi.doMock('@/lib/site-contact', () => ({
      SITE_CONTACT: {
        email: 'team@mdsupplies.com',
        phone: '+18005550100',
        phoneDisplay: '(800) 555-0100',
        address: {
          streetAddress: '1 Main St',
          addressLocality: 'Austin',
          addressRegion: 'TX',
          postalCode: '78701',
          addressCountry: 'US',
        },
        linkedIn: 'https://www.linkedin.com/company/mdsupplies',
      },
    }))
    const { buildOrganizationSchema: fresh } = await import('../organization')
    const schema = fresh() as unknown as Record<string, Record<string, unknown>>
    expect(schema.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '1 Main St',
      addressLocality: 'Austin',
      addressRegion: 'TX',
      postalCode: '78701',
      addressCountry: 'US',
    })
    expect(schema.contactPoint.telephone).toBe('+18005550100')
    vi.doUnmock('@/lib/site-contact')
    vi.resetModules()
  })
})
