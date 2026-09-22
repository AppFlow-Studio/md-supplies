import { describe, it, expect } from 'vitest'
import { buildOrderAttributionAttributes } from '@/lib/analytics/attribution'

const JANT = {
  utm_source: 'jant',
  utm_medium: 'email',
  utm_campaign: 'h_pylori_gi_clinics_q4_2026',
  utm_content: 'email_1_main_cta',
}

describe('buildOrderAttributionAttributes', () => {
  it('writes last-touch unprefixed and first-touch under md_first_', () => {
    const attrs = buildOrderAttributionAttributes({
      firstTouch: { ...JANT, utm_content: 'email_1_main_cta' },
      lastTouch: { ...JANT, utm_content: 'email_2_follow_up' },
    })
    // Unprefixed = last touch, matching GA4's last-non-direct-click default,
    // so the two systems agree rather than contradict.
    expect(attrs.md_utm_content).toBe('email_2_follow_up')
    expect(attrs.md_first_utm_content).toBe('email_1_main_cta')
    expect(attrs.md_utm_source).toBe('jant')
    expect(attrs.md_first_utm_source).toBe('jant')
  })

  it('falls back to first-touch when there has been no later campaign', () => {
    const attrs = buildOrderAttributionAttributes({ firstTouch: JANT, lastTouch: {} })
    // A single-visit customer has one campaign; a blank md_utm_source would
    // read as "no campaign" rather than "same campaign".
    expect(attrs.md_utm_source).toBe('jant')
    expect(attrs.md_first_utm_source).toBe('jant')
  })

  it('returns nothing for a visitor who arrived with no campaign', () => {
    expect(buildOrderAttributionAttributes({ firstTouch: {}, lastTouch: {} })).toEqual({})
  })

  it('carries Google Ads click identifiers through to the order', () => {
    const attrs = buildOrderAttributionAttributes({
      firstTouch: { gclid: 'abc123', utm_source: 'google', utm_medium: 'cpc' },
      lastTouch: {},
    })
    expect(attrs.md_gclid).toBe('abc123')
    expect(attrs.md_utm_medium).toBe('cpc')
  })

  it('keeps every supported click-id family', () => {
    const attrs = buildOrderAttributionAttributes({
      firstTouch: { gbraid: 'g', wbraid: 'w', msclkid: 'm', fbclid: 'f' },
      lastTouch: {},
    })
    expect(attrs).toMatchObject({
      md_gbraid: 'g', md_wbraid: 'w', md_msclkid: 'm', md_fbclid: 'f',
    })
  })

  it('drops params outside the allow-list rather than leaking them onto orders', () => {
    const attrs = buildOrderAttributionAttributes({
      firstTouch: { utm_source: 'jant', mc_eid: 'hashed-email-id', ttclid: 't' },
      lastTouch: {},
    })
    // mc_eid identifies an individual mailing-list subscriber and must not be
    // written onto an order record visible to staff.
    expect(attrs.md_mc_eid).toBeUndefined()
    expect(attrs.md_ttclid).toBeUndefined()
    expect(attrs.md_utm_source).toBe('jant')
  })

  it('truncates to Shopify’s 255-char attribute limit instead of failing the mutation', () => {
    const attrs = buildOrderAttributionAttributes({
      firstTouch: { utm_campaign: 'x'.repeat(400) },
      lastTouch: {},
    })
    expect(attrs.md_utm_campaign).toHaveLength(255)
  })

  it('ignores empty-string values', () => {
    const attrs = buildOrderAttributionAttributes({
      firstTouch: { utm_source: '', utm_medium: 'email' },
      lastTouch: {},
    })
    expect(attrs.md_utm_source).toBeUndefined()
    expect(attrs.md_utm_medium).toBe('email')
  })
})
