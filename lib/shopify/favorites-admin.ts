import 'server-only'
import { serverEnv } from '@/lib/env.server'
import { logServerError } from '@/lib/log-error'
import { getAdminAccessToken } from './admin-token'
import { assertShopDomainAllowed } from './shop-guard'
import type { ShopifyResponse } from './types'

// Narrowly-scoped Admin GraphQL client for customer favorites (DEV-FAV-01).
// Deliberately a SEPARATE client from lib/shopify/admin.ts's RX gate client
// (see that file's own comment: "new Admin needs get their own review, not a
// ride on this client") — same admin-token.ts credential (already scoped to
// customers read/write only), same shop-identity guard, but its own request
// path so a change to one feature's Admin usage can never silently touch the
// other's.

const ADMIN_API_VERSION = '2026-04'

async function adminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    const accessToken = await getAdminAccessToken()
    res = await fetch(
      `https://${serverEnv.shopifyStoreDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    )
  } catch (err) {
    logServerError('shopify-favorites-admin', err)
    throw err
  }

  if (!res.ok) {
    const message = `Admin API HTTP ${res.status}: ${res.statusText}`
    logServerError('shopify-favorites-admin', new Error(message))
    throw new Error(message)
  }

  const json: ShopifyResponse<T> = await res.json()
  if (json.errors?.length) {
    const message = json.errors.map((e: { message: string }) => e.message).join('\n')
    logServerError('shopify-favorites-admin', new Error(message))
    throw new Error(message)
  }
  return json.data
}

const SHOP_IDENTITY = `#graphql
  query FavoritesShopIdentity {
    shop { myshopifyDomain }
  }
`

let shopIdentityCheck: Promise<void> | null = null

/**
 * Same defense as lib/shopify/admin.ts's assertAuthenticatedShopIdentity:
 * confirms the Admin token actually authenticates against the shop this
 * build is allowed to write to before the first mutation. Held for the
 * process; a transient failure is never cached (fails closed, recoverable).
 */
async function assertAuthenticatedShopIdentity(): Promise<void> {
  shopIdentityCheck ??= (async () => {
    let data: { shop: { myshopifyDomain: string } | null }
    try {
      data = await adminFetch<{ shop: { myshopifyDomain: string } | null }>(SHOP_IDENTITY)
    } catch (err) {
      throw new Error(
        '[favorites-admin] could not verify the authenticated Shopify shop before an Admin ' +
          `mutation, so the mutation was refused: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    const reported = data.shop?.myshopifyDomain
    if (!reported) {
      throw new Error(
        '[favorites-admin] Shopify did not report a shop identity for this Admin token, so the ' +
          'mutation was refused.',
      )
    }
    assertShopDomainAllowed(reported, 'the shop this Admin token authenticates against')
  })().catch((err) => {
    shopIdentityCheck = null
    throw err
  })
  return shopIdentityCheck
}

/** Test-only: forces the next mutation to re-verify the shop identity. */
export function __resetFavoritesShopIdentityCacheForTests(): void {
  shopIdentityCheck = null
}

// One customer metafield holds the whole list as JSON. Minimal + stable per
// the ticket's data model: product GID, optional variant GID, created (and
// optional updated) timestamp — never title/price/image, which are resolved
// live from the product ID by the Storefront API at read time.
export const FAVORITES_METAFIELD = {
  namespace: 'favorites',
  key: 'items',
} as const

export type FavoriteRecord = {
  productId: string
  variantId: string | null
  createdAt: string
  updatedAt?: string
}

function isFavoriteRecord(value: unknown): value is FavoriteRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FavoriteRecord).productId === 'string' &&
    typeof (value as FavoriteRecord).createdAt === 'string'
  )
}

function parseFavorites(raw: string | null | undefined): FavoriteRecord[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isFavoriteRecord)
      .map((r) => ({ productId: r.productId, variantId: r.variantId ?? null, createdAt: r.createdAt, ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}) }))
  } catch {
    // A malformed value must never crash the account/PDP — treat as empty
    // rather than throwing, same fail-open-to-empty posture as the rest of
    // this module's reads.
    return []
  }
}

const GET_CUSTOMER_FAVORITES = `#graphql
  query GetCustomerFavorites($id: ID!, $namespace: String!, $key: String!) {
    customer(id: $id) {
      favorites: metafield(namespace: $namespace, key: $key) { value }
    }
  }
`

export async function getCustomerFavorites(customerId: string): Promise<FavoriteRecord[]> {
  const data = await adminFetch<{ customer: { favorites: { value: string } | null } | null }>(
    GET_CUSTOMER_FAVORITES,
    { id: customerId, namespace: FAVORITES_METAFIELD.namespace, key: FAVORITES_METAFIELD.key },
  )
  return parseFavorites(data.customer?.favorites?.value ?? null)
}

const SET_CUSTOMER_FAVORITES = `#graphql
  mutation SetCustomerFavorites($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`

async function writeCustomerFavorites(customerId: string, records: FavoriteRecord[]): Promise<void> {
  const data = await adminFetch<{ metafieldsSet: { userErrors: { message: string }[] } }>(
    SET_CUSTOMER_FAVORITES,
    {
      metafields: [
        {
          ownerId: customerId,
          namespace: FAVORITES_METAFIELD.namespace,
          key: FAVORITES_METAFIELD.key,
          type: 'json',
          value: JSON.stringify(records),
        },
      ],
    },
  )
  const errors = data.metafieldsSet.userErrors
  if (errors.length) {
    throw new Error(`metafieldsSet: ${errors.map((e) => e.message).join(', ')}`)
  }
}

/**
 * Idempotent add: a productId already on the list is left untouched (no
 * duplicate, no timestamp bump) — repeated/rapid "add" requests for the same
 * product converge on one record rather than oscillating or piling up.
 */
export async function addCustomerFavorite(
  customerId: string,
  productId: string,
  variantId: string | null,
): Promise<FavoriteRecord[]> {
  // Read before guarding the shop identity: a duplicate add is a pure no-op
  // and must never cost an extra Admin round trip, let alone attempt a write.
  const current = await getCustomerFavorites(customerId)
  if (current.some((r) => r.productId === productId)) return current
  const next: FavoriteRecord[] = [
    ...current,
    { productId, variantId, createdAt: new Date().toISOString() },
  ]
  await assertAuthenticatedShopIdentity()
  await writeCustomerFavorites(customerId, next)
  return next
}

/** Idempotent remove: removing a productId that isn't on the list is a no-op. */
export async function removeCustomerFavorite(
  customerId: string,
  productId: string,
): Promise<FavoriteRecord[]> {
  const current = await getCustomerFavorites(customerId)
  if (!current.some((r) => r.productId === productId)) return current
  const next = current.filter((r) => r.productId !== productId)
  await assertAuthenticatedShopIdentity()
  await writeCustomerFavorites(customerId, next)
  return next
}

/**
 * Orphan cleanup (product deleted / unpublished from the Storefront API — the
 * account Favorites view can't tell those two apart from a `nodes(ids:)`
 * response alone, and the documented rule is the same for both: suppress the
 * tile and drop the stale record). Only writes when something actually
 * changed, so a normal "every favorite still resolves" read never issues an
 * Admin mutation.
 */
export async function pruneCustomerFavorites(
  customerId: string,
  validProductIds: ReadonlySet<string>,
): Promise<FavoriteRecord[]> {
  const current = await getCustomerFavorites(customerId)
  const next = current.filter((r) => validProductIds.has(r.productId))
  if (next.length === current.length) return current
  await assertAuthenticatedShopIdentity()
  await writeCustomerFavorites(customerId, next)
  return next
}
