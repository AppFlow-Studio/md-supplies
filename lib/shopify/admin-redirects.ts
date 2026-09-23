import 'server-only'
import { serverEnv } from '@/lib/env.server'
import { logServerError } from '@/lib/log-error'
import { getAdminAccessToken } from './admin-token'
import type { ShopifyResponse } from './types'

// Narrowly-scoped Admin GraphQL client for reading Shopify's URL Redirect
// list (scripts/sync-redirects.ts). Deliberately its own client, not a ride
// on lib/shopify/admin.ts's RX client — that file's own header comment says
// "new Admin needs get their own review, not a ride on this client", and the
// RX client's custom app is scoped to read_customers + write_customers only
// (see .env.example) which does not cover URL Redirects.
//
// READ-ONLY. Requires the custom Admin app's scope to additionally include
// read_content (the scope that gates the UrlRedirect resource) — if that
// scope has not been granted yet, every call here fails closed with a
// GraphQL access error rather than silently returning an empty list.

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
    logServerError('shopify-admin-redirects', err)
    throw err
  }

  if (!res.ok) {
    const message = `Admin API HTTP ${res.status}: ${res.statusText}`
    logServerError('shopify-admin-redirects', new Error(message))
    throw new Error(message)
  }

  const json: ShopifyResponse<T> = await res.json()
  if (json.errors?.length) {
    const message = json.errors.map((e: { message: string }) => e.message).join('\n')
    logServerError('shopify-admin-redirects', new Error(message))
    throw new Error(message)
  }
  return json.data
}

const GET_ALL_URL_REDIRECTS = `#graphql
  query GetAllUrlRedirects($first: Int!, $after: String) {
    urlRedirects(first: $first, after: $after) {
      nodes { path target }
      pageInfo { hasNextPage endCursor }
    }
  }
`

export type ShopifyUrlRedirect = { from: string; to: string }

/**
 * Every URL Redirect Shopify currently holds for the configured store,
 * paginated 250/page. `serverEnv.shopifyStoreDomain` already gates which
 * shop this can reach (lib/shopify/shop-guard.ts — QA by default, production
 * only when SHOPIFY_ALLOWED_SHOP_DOMAIN is set on purpose), so this function
 * needs no separate shop check of its own.
 */
export async function fetchAllShopifyRedirects(): Promise<ShopifyUrlRedirect[]> {
  const rows: ShopifyUrlRedirect[] = []
  let after: string | null = null
  for (;;) {
    const data: { urlRedirects: { nodes: { path: string; target: string }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
      await adminFetch(GET_ALL_URL_REDIRECTS, { first: 250, after })
    for (const n of data.urlRedirects.nodes) rows.push({ from: n.path, to: n.target })
    if (!data.urlRedirects.pageInfo.hasNextPage) break
    after = data.urlRedirects.pageInfo.endCursor
  }
  return rows
}
