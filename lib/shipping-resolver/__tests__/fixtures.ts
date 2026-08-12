import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { normalizeShopDomain } from '@/lib/shopify/shop-guard'

/**
 * Shared handles on the resolver's test payloads.
 *
 * The checksum is computed from the bytes rather than pasted in, because the
 * loader validates a hash and four suites were each carrying their own copy of
 * it: editing a fixture meant updating eight literals by hand or watching
 * unrelated suites go red. The mismatch path is still covered explicitly, with
 * a deliberately wrong hash, so nothing is lost by deriving the matching one.
 *
 * `store` is read back from the payload so a fixture stays the single source of
 * truth for which shop it claims to describe.
 */
function describeFixture(name: string) {
  const path = join(__dirname, 'fixtures', name)
  const bytes = readFileSync(path)
  const meta = JSON.parse(bytes.toString('utf8'))._meta as { store: string }
  return {
    path,
    checksum: createHash('sha256').update(bytes).digest('hex'),
    /** The shop the payload declares, normalized to a bare host. */
    store: normalizeShopDomain(meta.store.trim().split(/\s+/)[0]),
  }
}

/** A real subset of production shipping-facts-v3.json (19 products). */
export const VALID = describeFixture('valid-payload.json')

/** Synthetic QA-store payload carrying a variant GID on two products. */
export const DUPLICATE = describeFixture('duplicate-variant-payload.json')

/** Synthetic QA-store payload for RATES_ONLY_SHOWS_CLAIM: standard-free
 *  classes whose effective_rate_class disagrees (curation drift). */
export const RATES_ONLY = describeFixture('rates-only-payload.json')
