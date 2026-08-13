// DEV-OCC-01 — canonical OCC catalog identity.
//
// The OCC page renders ONE canonical Shopify collection: no guessed handle
// list, no `tag:occ` scanning, no fixed featured-only assortment. The handle
// below matches the `occ` entry in lib/filter-registry.ts (measured against
// the live store in the coverage audit); OCC_COLLECTION_HANDLE overrides it
// per environment without a code change.
//
// PENDING IZZY: confirm the canonical OCC collection handle + GID in Shopify
// Admin and record both in the production handoff. Until that confirmation,
// count reconciliation stays BLOCKED — if the handle is wrong the page fails
// safe (empty-collection state), it does not fall back to tags.
export function getOccCollectionHandle(): string {
  return process.env.OCC_COLLECTION_HANDLE?.trim() || 'occ'
}
