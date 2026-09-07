import { describe, it, expect } from 'vitest'
import { getClusterLinks } from '@/lib/cluster-links'

describe('cluster links (OCC-SEO-STRATEGY §9 — hygiene→OCC reciprocal link)', () => {
  it('surfaces the OCC badge on the hygiene category', () => {
    const links = getClusterLinks('hygiene')
    expect(links).not.toBeNull()
    expect(links!.occEligible).toBe(true)
  })
})

describe('cluster links (SEO-CATEGORY-01 §8 — Needles & Syringes ↔ Trocars cross-sell)', () => {
  it('links Needles & Syringes to Trocars & Trocar Kits', () => {
    const links = getClusterLinks('needles-syringes')
    expect(links).not.toBeNull()
    expect(links!.categoryLinks).toEqual([
      { slug: 'trocars-trocar-kits', name: 'Trocars & Trocar Kits' },
    ])
  })

  it('surfaces Trocars & Trocar Kits\' own HRT Clinics, Kadara Medical, and reciprocal Needles & Syringes links', () => {
    const links = getClusterLinks('trocars-trocar-kits')
    expect(links).not.toBeNull()
    expect(links!.industryLinks).toEqual([{ slug: 'hrt-clinics', name: 'HRT Clinics' }])
    expect(links!.partnerLinks).toEqual([{ slug: 'kadara', name: 'Kadara Medical' }])
    expect(links!.categoryLinks).toEqual([{ slug: 'needles-syringes', name: 'Needles & Syringes' }])
  })
})
