import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * P2-2 — SEO/AEO/GEO regression guardrails.
 *
 * These are *route-level* guards over the `app/` directory. The unit tests in
 * this folder already prove the SEO helpers (`buildMetadata`, `buildRobots`,
 * `buildCanonical`, sitemap, robots.txt) behave correctly in isolation. What
 * they cannot catch is a frontend change that silently *unwires* those helpers
 * from a page — deleting a `generateMetadata` export, pasting a blanket
 * `noindex` onto a launch page, or removing the sitemap/robots entrypoints.
 *
 * This file scans the actual page source so that kind of regression fails CI
 * instead of shipping. It acts as the review gate the ticket describes.
 */

const APP_DIR = fileURLToPath(new URL('../../../app', import.meta.url))

/** Recursively collect every `page.tsx` under `app/`, returned app-relative. */
function findPageFiles(dir: string, appRoot: string = dir): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...findPageFiles(full, appRoot))
    } else if (entry.name === 'page.tsx') {
      out.push(path.relative(appRoot, full))
    }
  }
  return out
}

const read = (relPath: string) => readFileSync(path.join(APP_DIR, relPath), 'utf8')

/** Routes that live in the `(noindex)` group are intentionally private. */
const isNoindexGroup = (relPath: string) => relPath.startsWith('(noindex)/')

/** A redirect stub renders no content and legitimately has no metadata. */
const isRedirectStub = (src: string) =>
  /\bredirect\s*\(/.test(src) && !/return\s*\(/.test(src)

/**
 * Pages that are *allowed* to set a conditional noindex, with the reason.
 * Anything else introducing a noindex signal is treated as an accidental
 * regression on a launch page.
 */
const CONDITIONAL_NOINDEX_ALLOWLIST: Record<string, string> = {
  'category/[slug]/page.tsx': 'filtered/sorted views canonical to the unfiltered page',
  'industries/[industry-slug]/page.tsx': 'thin industry pages stay out of the index until FAQ copy lands',
}

/** Signals in page source that would keep a page out of the index. */
const NOINDEX_SIGNAL = /noIndex:\s*true|index:\s*false|noindex,\s*nofollow|noindex,\s*follow/

const pageFiles = findPageFiles(APP_DIR)

describe('SEO route guardrails — metadata is wired on every launch page', () => {
  it('found the app pages to scan', () => {
    // Sanity check: if the walk returns nothing the other assertions are vacuous.
    expect(pageFiles.length).toBeGreaterThan(10)
  })

  for (const relPath of pageFiles) {
    if (isNoindexGroup(relPath)) continue

    it(`${relPath} exports title/description metadata`, () => {
      const src = read(relPath)
      if (isRedirectStub(src)) return // redirect stubs render nothing to index
      expect(
        /generateMetadata|export const metadata/.test(src),
        `${relPath} is an indexable page but exports no metadata — titles/descriptions/canonical would be lost`,
      ).toBe(true)
    })
  }
})

describe('SEO route guardrails — no accidental noindex on launch pages', () => {
  for (const relPath of pageFiles) {
    if (isNoindexGroup(relPath)) continue
    if (relPath in CONDITIONAL_NOINDEX_ALLOWLIST) continue

    it(`${relPath} does not introduce a noindex directive`, () => {
      const src = read(relPath)
      expect(
        NOINDEX_SIGNAL.test(src),
        `${relPath} introduces a noindex signal but is not in the intentional allowlist — a launch page may have been accidentally noindexed`,
      ).toBe(false)
    })
  }
})

describe('SEO route guardrails — private routes stay noindexed', () => {
  const noindexPages = pageFiles.filter(isNoindexGroup)

  it('has private pages under the (noindex) group', () => {
    expect(noindexPages.length).toBeGreaterThan(0)
  })

  for (const relPath of noindexPages) {
    it(`${relPath} keeps its noindex directive`, () => {
      const src = read(relPath)
      expect(
        /index:\s*false/.test(src),
        `${relPath} lives in the (noindex) group but no longer emits index:false — a private route may leak into the index`,
      ).toBe(true)
    })
  }
})

describe('SEO route guardrails — sitemap and robots entrypoints stay wired', () => {
  it('app/sitemap.ts delegates to getSitemapUrls', () => {
    const src = read('sitemap.ts')
    expect(src).toMatch(/getSitemapUrls/)
    expect(src).toMatch(/export default/)
  })

  it('app/robots.ts delegates to getRobotsConfig', () => {
    const src = read('robots.ts')
    expect(src).toMatch(/getRobotsConfig/)
    expect(src).toMatch(/export default/)
  })
})
