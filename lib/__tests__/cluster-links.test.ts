import { describe, it, expect } from 'vitest'
import { getClusterLinks } from '@/lib/cluster-links'

describe('cluster links (OCC-SEO-STRATEGY §9 — hygiene→OCC reciprocal link)', () => {
  it('surfaces the OCC badge on the hygiene category', () => {
    const links = getClusterLinks('hygiene')
    expect(links).not.toBeNull()
    expect(links!.occEligible).toBe(true)
  })
})
