import 'server-only'
import type { ProductLabel } from './labels'

// DEV-LABEL-01 — Fordeer Product Labels & Badges provider (BLOCKED).
//
// Status of the headless-path investigation (2026-07-30):
//  - Fordeer's public app-store materials and vendor pages document THEME
//    compatibility (script/theme-extension injection) only. No public REST/
//    GraphQL API, app proxy, metafield/metaobject output, webhook feed, or
//    documented export suitable for a headless storefront was found in the
//    sources reviewed.
//  - Scraping the theme DOM, replaying undocumented admin calls, or exposing
//    app credentials in the browser are prohibited by the execution plan and
//    are not implemented.
//
// UNBLOCK PATH (one of):
//  1. Fordeer support confirms a supported retrieval method (ticket template
//     in audit/izzy-production-handoff-2026-07-30.md) → implement
//     fetchFordeerLabels() against it, normalize into ProductLabel, cache,
//     and fail closed on errors.
//  2. Client approves the synchronization fallback: Izzy mirrors the approved
//     Fordeer campaigns into dedicated Shopify metafields/metaobjects (one
//     staff workflow stays authoritative in Fordeer; a documented sync keeps
//     the metafields current), and this provider reads those metafields.
//
// Until then this provider is disabled and returns no labels — components
// render only the tag/metafield labels from lib/labels/labels.ts and the
// resolver-backed shipping badge. Nothing customer-facing depends on Fordeer.

export function isFordeerLabelsEnabled(): boolean {
  // Fail-safe: absent/invalid env value means disabled.
  return process.env.FORDEER_LABELS_ENABLED === 'true'
}

/**
 * Labels keyed by product GID. Disabled (empty) until a supported Fordeer
 * retrieval path is proven — see the blocker notes above.
 */
export async function fetchFordeerLabels(
  _productGids: string[],
): Promise<Record<string, ProductLabel[]>> {
  if (!isFordeerLabelsEnabled()) return {}
  // Intentionally unreachable in every current environment: enabling the
  // flag without an implemented supported path must fail loudly in review,
  // not silently invent labels.
  throw new Error(
    '[labels] FORDEER_LABELS_ENABLED is set but no supported Fordeer retrieval path is implemented. ' +
      'See lib/labels/fordeer-provider.ts for the unblock paths.',
  )
}
