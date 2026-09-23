import type { FAQItem } from './seoTypes'

export interface SolutionSeoData {
  title: string
  metaDescription: string
  answerBlock: string
  faqs: FAQItem[]
}

// Keyed by solution route slug.
//
// NOTE: this DB previously carried an 'occ' entry describing OCC as an
// "Organized Customer Care" nonprofit tiered-pricing program — a meaning
// invented during early scaffolding (see git history on this file, and
// docs/superpowers/plans/2026-06-17-priority-11-implementation.md) that was
// never real. lib/occ.ts was already corrected to the client's actual
// meaning (Operation Christmas Child shoebox supplies) in later commits, but
// this file's title/metaDescription silently overrode that correct copy in
// the rendered <title>/meta tags and WebPage schema (see
// generateMetadata/baseMetadata in app/solutions/occ/page.tsx). Removed
// rather than corrected in place — OCC_HUB.seoTitle/seoDescription in
// lib/occ.ts are the single source of truth for this route, and duplicating
// them here would just recreate the drift risk.
const SOLUTION_SEO_DB: Record<string, SolutionSeoData> = {}

export function getSolutionSeo(slug: string): SolutionSeoData | undefined {
  return SOLUTION_SEO_DB[slug]
}
