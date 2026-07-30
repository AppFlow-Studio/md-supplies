import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * DEV-CATALOG-01 / DEV-LABEL-01 source guards:
 *  - no customer-facing "In stock" claim may ship (vendor inventory is not
 *    real time; "Out of Stock" is a suppression, not a claim, and stays);
 *  - no component may derive a Free Shipping badge from the raw
 *    `free-shipping` catalog tag — the shipping resolver is the only
 *    approved source for a shipping claim.
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

/**
 * Strips block and line comments so the guards inspect code that can actually
 * reach a customer, not the comments that explain why a claim was removed
 * (those legitimately name the forbidden phrase).
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

function codeOf(file: string): string {
  return stripComments(readFileSync(file, 'utf8'))
}

describe('catalog claim guards', () => {
  it('no shipped source renders an "In stock" claim', () => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      codeOf(f).toLowerCase().includes('in stock'),
    )
    expect(offenders).toEqual([])
  })

  it('no shipped source renders another availability promise', () => {
    // Plan: don't replace "In stock" with "Available"/"Ready to ship" either.
    const phrases = ['ready to ship', 'ships today', 'in-stock']
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) => {
      const code = codeOf(f).toLowerCase()
      return phrases.some((p) => code.includes(p))
    })
    expect(offenders).toEqual([])
  })

  it('no component keys a badge off the raw free-shipping tag', () => {
    const patterns = [`includes('free-shipping')`, `includes("free-shipping")`, `'free-shipping'`, `"free-shipping"`]
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) => {
      const code = codeOf(f)
      return patterns.some((p) => code.includes(p))
    })
    expect(offenders).toEqual([])
  })

  it('no component declares a tag-driven free-shipping flag', () => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      codeOf(f).includes('hasFreeShipping'),
    )
    expect(offenders).toEqual([])
  })
})
