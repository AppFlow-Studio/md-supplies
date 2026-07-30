import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  RETURN_POLICY_PLAIN_TEXT,
  RETURN_POLICY_SECTIONS,
  resolveReturnPolicy,
} from '../policy/return-policy'

/**
 * DEV-POLICY-01: the approved return policy (plan §7.2) is the ONLY return
 * policy the site may state, and the prohibited OCC payment-terms claim must
 * never reappear. Like the support-address guard, this scans shipped source —
 * a constant alone cannot prevent a hardcoded promise from drifting back in.
 */

// Customer-facing wording that contradicts the approved policy or reintroduces
// the payment-terms claim. Case-insensitive.
const FORBIDDEN_PHRASES = [
  '30-day return',
  '30 days of delivery',
  'returns within 30 days',
  'prepaid shipping label',
  'prepaid label',
  'hassle-free return',
  'guaranteed return',
  'guaranteed refund',
  'dedicated pricing, terms',
  'terms & account support',
  'terms &amp; account support',
]

const ROOTS = ['app', 'components', 'lib']
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

describe('return policy copy (DEV-POLICY-01)', () => {
  it.each(FORBIDDEN_PHRASES)('no shipped source contains: %s', (phrase) => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      readFileSync(f, 'utf8').toLowerCase().includes(phrase.toLowerCase()),
    )
    expect(offenders).toEqual([])
  })

  it('contains the approved §7.2 copy verbatim', () => {
    // Sentence-level spot checks of the client-approved wording. If any of
    // these fail, the approved copy was edited — which requires written
    // client approval, not a code change.
    expect(RETURN_POLICY_PLAIN_TEXT).toContain(
      'Because we partner with multiple vendors and manufacturers, return policies vary by product.',
    )
    expect(RETURN_POLICY_PLAIN_TEXT).toContain('Return Authorization Required')
    expect(RETURN_POLICY_PLAIN_TEXT).toContain(
      'If a Return Goods Authorization (RGA) number is required by the vendor or manufacturer, it must be obtained prior to shipping the item back.',
    )
    expect(RETURN_POLICY_PLAIN_TEXT).toContain(
      'the return will not be accepted, and no refund, credit, or exchange will be issued.',
    )
    expect(RETURN_POLICY_PLAIN_TEXT).toContain(
      'please contact our customer support team before sending your item back.',
    )
  })

  it('resolver falls back to the approved general policy and is never empty', () => {
    const general = resolveReturnPolicy({ vendor: 'Dynarex' })
    expect(general.source).toBe('general')
    expect(general.sections).toEqual(RETURN_POLICY_SECTIONS)
    expect(general.sections.flatMap((s) => s.paragraphs).length).toBeGreaterThan(0)

    const noInput = resolveReturnPolicy()
    expect(noInput.source).toBe('general')
  })

  it('resolver renders approved vendor copy verbatim when supplied', () => {
    const vendor = resolveReturnPolicy({
      vendor: 'Drive Medical',
      vendorPolicyText: 'Approved paragraph one.\n\nApproved paragraph two.',
    })
    expect(vendor.source).toBe('vendor')
    expect(vendor.sections).toEqual([
      {
        heading: 'Drive Medical Return Policy',
        paragraphs: ['Approved paragraph one.', 'Approved paragraph two.'],
      },
    ])
  })

  it('blank vendor text falls back to general (tab can never be empty)', () => {
    expect(resolveReturnPolicy({ vendorPolicyText: '   ' }).source).toBe('general')
  })
})
