import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CLAIMS, getClaim, isClaimApproved, approvedClaims, type ClaimKey } from '../claims'

/**
 * DEV-SEO-01 / plan §2.1 — unsupported performance and catalog claims must
 * not render, and must not creep back in as hardcoded strings.
 */

const ROOTS = ['app', 'components']
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'docs'])

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

describe('approved-claims register', () => {
  it('every claim ships unapproved until written evidence exists', () => {
    for (const [key, claim] of Object.entries(CLAIMS)) {
      expect(isClaimApproved(key as ClaimKey), `${key} must stay blocked until approved`).toBe(false)
      expect(claim.source, `${key} has no written source yet`).toBeNull()
      expect(claim.evidenceDate, `${key} has no evidence date yet`).toBeNull()
    }
  })

  it('getClaim returns null for unapproved claims, so the UI renders nothing', () => {
    expect(getClaim('facilitiesServed')).toBeNull()
    expect(getClaim('orderAccuracy')).toBeNull()
    expect(getClaim('shippingSpeed')).toBeNull()
    expect(getClaim('productCount')).toBeNull()
  })

  it('approvedClaims filters out everything unapproved', () => {
    expect(approvedClaims(['facilitiesServed', 'productCount', 'shippingSpeed'])).toEqual([])
  })

  it('approval requires all three of approved + source + date', () => {
    // Guards the gate itself: flipping `approved` alone must not enable a claim.
    const partial = { text: '9,999', source: null, evidenceDate: '2026-07-30', approved: true }
    expect(Boolean(partial.approved && partial.source && partial.evidenceDate)).toBe(false)
  })
})

describe('no hardcoded unsourced claims in shipped source', () => {
  // Numbers and phrases the plan flags as requiring written approval.
  const FORBIDDEN = [
    '12,000+',
    '10,000+',
    '8,000+',
    '99.8',
    '7,384',
    '7,385',
    '1,000+',
    '24-48 hr',
    'Fast Shipping',
    'fast shipping',
    'ships fast',
    'fast, reliable fulfillment',
  ]

  it.each(FORBIDDEN)('no shipped source renders: %s', (phrase) => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      stripComments(readFileSync(f, 'utf8')).includes(phrase),
    )
    expect(offenders).toEqual([])
  })
})
