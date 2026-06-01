// lib/seo.ts — B1 stub; replaced wholesale when Munis's branch merges
import type { Metadata } from 'next'

export const STAGING_GUARD = process.env.NEXT_PUBLIC_IS_STAGING === 'true'

interface BuildMetadataOptions {
  pageType: 'category' | 'subcategory' | 'product' | 'page'
  title: string
  slug?: string
  description?: string
  canonical?: string
  noindex?: boolean
}

export function buildMetadata(opts: BuildMetadataOptions): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
  // slug-derived fallback only works for pageType:'category' (path is /category/<slug>).
  // For subcategory/product/page, always pass canonical explicitly.
  const canonical =
    opts.canonical ??
    (opts.pageType === 'category' && opts.slug
      ? `${base}/category/${opts.slug}`
      : base)
  return {
    title: `${opts.title} | MD Supplies`,
    description: opts.description,
    alternates: { canonical },
    robots: opts.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}
