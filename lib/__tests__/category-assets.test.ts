import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORY_IMAGE_CONFIG, CATEGORY_IMAGE_FALLBACK } from '../category-images'
import { ROADMAP_CATEGORIES } from '../category-nav'
import { CATEGORY_TREE_L1 } from '../category-tree'
import { getCategoryBannerConfig } from '../bunnycdn'

/**
 * DEV-CAT-01 — every active category must carry an approved image and
 * descriptive alt text, and no customer-facing surface may fall back to an
 * initial-letter placeholder.
 */

describe('category asset coverage', () => {
  it('every roadmap category has an image entry with a file and descriptive alt', () => {
    const missing: string[] = []
    for (const category of ROADMAP_CATEGORIES) {
      const entry = CATEGORY_IMAGE_CONFIG[category.placeholderSlug]
      if (!entry) {
        missing.push(category.placeholderSlug)
        continue
      }
      expect(entry.file.trim(), `${category.placeholderSlug} file`).not.toBe('')
      expect(entry.file, `${category.placeholderSlug} file extension`).toMatch(/\.(jpe?g|png|webp|avif)$/i)
      // Alt text must describe the category, not repeat the filename.
      expect(entry.alt.trim().length, `${category.placeholderSlug} alt text`).toBeGreaterThan(8)
      expect(entry.alt, `${category.placeholderSlug} alt text`).not.toMatch(/placeholder|\.jpe?g|\.png/i)
    }
    expect(missing, 'roadmap categories with no image entry').toEqual([])
  })

  it('every active L1 registry category resolves to a real banner path and alt', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      const banner = getCategoryBannerConfig(l1.collectionHandle)
      expect(banner.path, `${l1.collectionHandle} path`).toMatch(/^\/api\/bunny\/categories\/.+\.(jpe?g|png|webp|avif)$/i)
      expect(banner.alt.trim().length, `${l1.collectionHandle} alt`).toBeGreaterThan(8)
    }
  })

  it('the neutral fallback entry is itself complete', () => {
    expect(CATEGORY_IMAGE_FALLBACK.file.trim()).not.toBe('')
    expect(CATEGORY_IMAGE_FALLBACK.alt.trim().length).toBeGreaterThan(8)
  })
})

describe('no initial-letter placeholders on customer-facing surfaces', () => {
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

  it('no page passes a fallbackLabel to CategoryImage', () => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r))
      // The component itself still supports the prop; only callers matter.
      .filter((f) => !f.endsWith(join('shared', 'CategoryImage.tsx')))
      .filter((f) => /fallbackLabel(?!WrapperClassName|TextClassName)\s*=/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
