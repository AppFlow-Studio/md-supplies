import type { Metadata } from 'next'
import { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from './constants'
import { buildCanonical } from './canonical'
import { buildRobots, STAGING_GUARD } from './robots'
import { buildOg } from './og'
import type { MetadataInput, PageType } from './types'

// ─── internal helpers ────────────────────────────────────────────────────────

/** Converts a URL slug to a human-readable title (e.g. `exam-gloves` → `Exam Gloves`). */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Derives the page path from the page type and optional slug/parentSlug. */
function resolvePath(pageType: PageType, slug?: string, parentSlug?: string): string {
  switch (pageType) {
    case 'homepage':       return '/'
    case 'categories-hub': return '/categories'
    case 'category':       return slug ? `/category/${slug}` : '/categories'
    case 'subcategory':    return parentSlug && slug ? `/category/${parentSlug}/${slug}` : slug ? `/category/${slug}` : '/'
    case 'product':        return slug ? `/product/${slug}` : '/shop'
    case 'partners':       return '/partners'
    case 'partner-detail': return slug ? `/partners/${slug}` : '/partners'
    case 'industry':       return slug ? `/industries/${slug}` : '/industries'
    case 'occ':            return '/solutions/occ'
    case 'blog-hub':       return '/blog'
    case 'blog-article':   return slug ? `/blog/${slug}` : '/blog'
    case 'static':         return slug ? `/${slug}` : '/'
    case 'utility':        return slug ? `/${slug}` : '/'
  }
}

/** Google's SERP title display cuts off around this many characters. */
const MAX_TITLE_LENGTH = 60

/**
 * Appends the brand suffix only if the result fits the SERP display limit.
 * A long enriched/product title is more valuable than a truncated brand tag,
 * so once the budget is blown the suffix is dropped rather than overflowing.
 */
function withBrandSuffix(base: string, suffix: string): string {
  const full = `${base}${suffix}`
  if (full.length <= MAX_TITLE_LENGTH) return full
  if (base.length <= MAX_TITLE_LENGTH) return base

  const sliced = base.slice(0, MAX_TITLE_LENGTH)
  const lastSpace = sliced.lastIndexOf(' ')
  return (lastSpace > 20 ? sliced.slice(0, lastSpace) : sliced).trimEnd()
}

/**
 * Generates the `<title>` value for a page.
 * Never returns an empty string — always has at least the site name.
 */
function resolveTitle(pageType: PageType, title?: string, parentSlug?: string): string {
  const t = title?.trim() ?? ''
  const suffix = ` — ${SITE_NAME}`

  switch (pageType) {
    case 'homepage':
      return DEFAULT_TITLE
    case 'categories-hub':
      return `All Categories${suffix}`
    case 'category':
      return t ? withBrandSuffix(t, suffix) : DEFAULT_TITLE
    case 'subcategory': {
      const parent = parentSlug ? slugToTitle(parentSlug) : ''
      if (t && parent) return withBrandSuffix(`${t} — ${parent}`, suffix)
      if (t) return withBrandSuffix(t, suffix)
      return DEFAULT_TITLE
    }
    case 'product':
      return t ? withBrandSuffix(t, suffix) : DEFAULT_TITLE
    case 'partners':
      return `Our Partners${suffix}`
    case 'partner-detail':
      return t ? withBrandSuffix(t, `${suffix} Partner`) : `Partners${suffix}`
    case 'industry':
      return t ? withBrandSuffix(`${t} Supplies`, suffix) : DEFAULT_TITLE
    case 'occ':
      return `OCC Solutions${suffix}`
    case 'blog-hub':
      return `Blog${suffix}`
    case 'blog-article':
      return t ? withBrandSuffix(t, `${suffix} Blog`) : `Blog${suffix}`
    case 'static':
      return t ? withBrandSuffix(t, suffix) : SITE_NAME
    case 'utility':
      return t ? withBrandSuffix(t, suffix) : SITE_NAME
  }
}

// ─── buildMetadata ───────────────────────────────────────────────────────────

/**
 * Generates a complete Next.js `Metadata` object for any public page.
 *
 * Guarantees:
 * - `title` is never blank or undefined.
 * - `description` is never blank or undefined.
 * - `openGraph.images` always contains at least one image.
 * - `alternates.canonical` always points to the resolved page URL.
 */
export function buildMetadata(input: MetadataInput): Metadata {
  const {
    pageType,
    title,
    description,
    slug,
    parentSlug,
    image,
    imageWidth,
    imageHeight,
    noIndex = false,
  } = input

  const resolvedTitle = resolveTitle(pageType, title, parentSlug)
  const resolvedDescription = description?.trim() || DEFAULT_DESCRIPTION
  const path = resolvePath(pageType, slug, parentSlug)
  const canonical = input.canonical ?? buildCanonical({ path, strategy: 'self' })
  const robots = buildRobots({ pageType, noIndex, isStaging: STAGING_GUARD })
  const og = buildOg({
    pageType,
    title: resolvedTitle,
    description: resolvedDescription,
    url: canonical,
    image,
    imageWidth,
    imageHeight,
  })

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    robots,
    alternates: { canonical },
    ...og,
  }
}
