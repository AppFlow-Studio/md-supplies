import { describe, it, expect } from 'vitest'
import {
  INDUSTRIES,
  SUPPORTED_INDUSTRIES,
  isIndustryIndexable,
  hasValidatedAssortment,
  isIndustryComplete,
} from '../industries'

/**
 * Industry support gate (Phase 7/10).
 *
 * Catalog audit 2026-08-02 against the July-7 export: active products carry
 * exactly SIX `industry:` values —
 *   clinic 6,390 · urgent-care 4,344 · home-care 3,091 · hrt-surgery 531 ·
 *   pharmacy 282 · occ-charities 106  (counts overlap).
 *
 * Five back an industry page; occ-charities is served by /solutions/occ. The
 * other seven requested pages have no approved product membership, so they
 * must not be indexed, sitemapped or linked from navigation.
 */

const UNBACKED = [
  'ems',
  'long-term-care',
  'physical-therapy',
  'private-practice',
  'dental',
  'veterinary',
  'community-health',
]

const BACKED = ['urgent-care', 'hrt-clinics', 'home-health', 'clinics-doctors-offices', 'pharmacies']

describe('industry assortment validation', () => {
  it('exactly the five tag-backed industries are supported', () => {
    expect(SUPPORTED_INDUSTRIES.map((i) => i.slug).sort()).toEqual([...BACKED].sort())
  })

  it('every supported industry maps to one of the six real catalog tags', () => {
    const REAL = new Set([
      'industry:clinic',
      'industry:urgent-care',
      'industry:home-care',
      'industry:hrt-surgery',
      'industry:pharmacy',
      'industry:occ-charities',
    ])
    for (const i of SUPPORTED_INDUSTRIES) {
      expect(i.tag, `${i.slug} must carry a tag`).toBeTruthy()
      expect(REAL.has(i.tag!), `${i.slug} tag ${i.tag} must be a real catalog value`).toBe(true)
    }
  })

  it.each(UNBACKED)('%s has no validated assortment and is not indexable', (slug) => {
    const industry = INDUSTRIES.find((i) => i.slug === slug)
    expect(industry, `${slug} should still exist in the registry`).toBeTruthy()
    expect(hasValidatedAssortment(industry!)).toBe(false)
    expect(isIndustryIndexable(industry!)).toBe(false)
    expect(SUPPORTED_INDUSTRIES.map((i) => i.slug)).not.toContain(slug)
  })

  it('Veterinary specifically is excluded — the catalog has zero veterinary products', () => {
    const vet = INDUSTRIES.find((i) => i.slug === 'veterinary')!
    expect(vet.tag).toBeUndefined()
    expect(isIndustryIndexable(vet)).toBe(false)
    // Guard against "filling the page" with human-medical products.
    expect(SUPPORTED_INDUSTRIES.some((i) => i.slug === 'veterinary')).toBe(false)
  })

  it('indexability requires BOTH unique content and a real assortment', () => {
    for (const i of INDUSTRIES) {
      expect(isIndustryIndexable(i)).toBe(isIndustryComplete(i) && hasValidatedAssortment(i))
    }
  })
})

describe('sitemap and navigation agree with the gate', () => {
  it('the sitemap builder consumes SUPPORTED_INDUSTRIES, not INDUSTRIES', async () => {
    const src = await import('node:fs').then((fs) => fs.readFileSync('lib/seo/sitemap.ts', 'utf8'))
    expect(src).toContain('SUPPORTED_INDUSTRIES')
    // The unfiltered list must not be mapped into sitemap entries. The lookbehind
    // matters: SUPPORTED_INDUSTRIES also ends in "INDUSTRIES".
    expect(src).not.toMatch(/(?<!SUPPORTED_)INDUSTRIES\.map\(/)
  })

  it('the industries grid and homepage strip consume SUPPORTED_INDUSTRIES', async () => {
    const fs = await import('node:fs')
    for (const f of ['app/industries/page.tsx', 'components/home/ShopByIndustry.tsx']) {
      const src = fs.readFileSync(f, 'utf8')
      expect(src, `${f} must filter`).toContain('SUPPORTED_INDUSTRIES')
    }
  })
})
