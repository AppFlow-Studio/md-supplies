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
    case 'utility':        return slug ? `/${slug}` : '/'
  }
}

/**
 * Generates the `<title>` value for a page.
 * Never returns an empty string — always has at least the site name.
 */
function resolveTitle(pageType: PageType, title?: string, parentSlug?: string): string {
  const t = title?.trim() ?? ''

  switch (pageType) {
    case 'homepage':
      return DEFAULT_TITLE
    case 'categories-hub':
      return `All Categories — ${SITE_NAME}`
    case 'category':
      return t ? `${t} — ${SITE_NAME}` : DEFAULT_TITLE
    case 'subcategory': {
      const parent = parentSlug ? slugToTitle(parentSlug) : ''
      if (t && parent) return `${t} — ${parent} — ${SITE_NAME}`
      if (t) return `${t} — ${SITE_NAME}`
      return DEFAULT_TITLE
    }
    case 'product':
      return t ? `${t} — ${SITE_NAME}` : DEFAULT_TITLE
    case 'partners':
      return `Our Partners — ${SITE_NAME}`
    case 'partner-detail':
      return t ? `${t} — ${SITE_NAME} Partner` : `Partners — ${SITE_NAME}`
    case 'industry':
      return t ? `${t} Supplies — ${SITE_NAME}` : DEFAULT_TITLE
    case 'occ':
      return `OCC Solutions — ${SITE_NAME}`
    case 'blog-hub':
      return `Blog — ${SITE_NAME}`
    case 'blog-article':
      return t ? `${t} — ${SITE_NAME} Blog` : `Blog — ${SITE_NAME}`
    case 'utility':
      return t ? `${t} — ${SITE_NAME}` : SITE_NAME
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
  })

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    robots,
    alternates: { canonical },
    ...og,
  }
}
