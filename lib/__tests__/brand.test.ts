import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { publicBrand, hasPublicBrand } from '../brand'
import { isBlockedFacetId } from '../filter-registry'

/**
 * Public Brand must be `custom.brand_name` or nothing — never Shopify's
 * `vendor`, which holds the FULFILLING vendor (MedPlus, Medchain, …).
 *
 * PR #55's 5f3f26c hard-denied the vendor *facet*; this guards the *rendering*
 * layer, which still fell back to vendor whenever brand_name was empty.
 * Catalog audit 2026-08-02: brand_name ≠ vendor on 3,790 of 7,384 active
 * products (51%), so the fallback was wrong for about half the catalogue, and
 * 41 active products have no brand at all — callers must handle absence.
 */

describe('publicBrand', () => {
  it('reads a flattened string or a raw metafield object', () => {
    expect(publicBrand({ brandName: 'Dukal' })).toBe('Dukal')
    expect(publicBrand({ brandName: { value: 'Dynarex' } })).toBe('Dynarex')
  })

  it('returns null for absent, empty, or whitespace-only brands', () => {
    expect(publicBrand({ brandName: null })).toBeNull()
    expect(publicBrand({ brandName: '' })).toBeNull()
    expect(publicBrand({ brandName: { value: '   ' } })).toBeNull()
    expect(publicBrand({})).toBeNull()
    expect(publicBrand(null)).toBeNull()
    expect(publicBrand(undefined)).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(publicBrand({ brandName: '  Exel  ' })).toBe('Exel')
  })

  it('has no parameter through which a vendor could be supplied', () => {
    // Structural guarantee: the resolver cannot see `vendor` at all, so no
    // future edit can reintroduce the fallback inside it.
    const withVendor = { brandName: null, vendor: 'MedPlus' } as never
    expect(publicBrand(withVendor)).toBeNull()
    expect(hasPublicBrand(withVendor)).toBe(false)
  })
})

describe('vendor facet stays hard-denied (PR #55 / 5f3f26c)', () => {
  it('blocks filter.p.vendor and raw tag facets', () => {
    expect(isBlockedFacetId('filter.p.vendor')).toBe(true)
    expect(isBlockedFacetId('filter.p.tag')).toBe(true)
    expect(isBlockedFacetId('filter.p.tag.category')).toBe(true)
  })

  it('still allows approved sources', () => {
    expect(isBlockedFacetId('filter.v.availability')).toBe(false)
    expect(isBlockedFacetId('filter.p.m.custom.brand_name')).toBe(false)
  })
})

describe('no component renders Shopify vendor as a customer-facing brand', () => {
  const ROOTS = ['app', 'components']
  const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'docs'])

  function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) sourceFiles(full, out)
      else if (/\.tsx?$/.test(entry)) out.push(full)
    }
    return out
  }

  function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  }

  it('no `brandName ?? vendor` (or equivalent) fallback survives', () => {
    const patterns = [
      /brandName\s*\?\?\s*\w*\.?vendor/,
      /brandName\s*\|\|\s*\w*\.?vendor/,
      /vendor\s*\|\|\s*\w*\.?brand\b/,
    ]
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) => {
      const code = stripComments(readFileSync(f, 'utf8'))
      return patterns.some((p) => p.test(code))
    })
    expect(offenders).toEqual([])
  })

  it('no component assigns product.vendor to a brand field or item_brand', () => {
    const patterns = [/brand:\s*\w+\.vendor\b/, /item_brand:\s*\w+\.vendor\b/]
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) => {
      const code = stripComments(readFileSync(f, 'utf8'))
      return patterns.some((p) => p.test(code))
    })
    expect(offenders).toEqual([])
  })

  it('no JSX renders {product.vendor} directly', () => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      /\{\s*\w+\.vendor\s*\}/.test(stripComments(readFileSync(f, 'utf8'))),
    )
    expect(offenders).toEqual([])
  })
})
