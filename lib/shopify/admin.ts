import 'server-only'
import { serverEnv } from '@/lib/env.server'
import { logServerError } from '@/lib/log-error'
import { RX_METAFIELDS } from '@/lib/rx-gate'
import type { ShopifyResponse } from './types'

// Narrowly-scoped Admin GraphQL client for the RX prescription gate. The
// token (SHOPIFY_ADMIN_ACCESS_TOKEN) is scoped to customers read/write only;
// keep this module's surface to the two RX metafield operations — new Admin
// needs get their own review, not a ride on this client.

const ADMIN_API_VERSION = '2026-04'

async function adminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(
      `https://${serverEnv.shopifyStoreDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': serverEnv.shopifyAdminToken,
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    )
  } catch (err) {
    logServerError('shopify-admin', err)
    throw err
  }

  if (!res.ok) {
    const message = `Admin API HTTP ${res.status}: ${res.statusText}`
    logServerError('shopify-admin', new Error(message))
    throw new Error(message)
  }

  const json: ShopifyResponse<T> = await res.json()
  if (json.errors?.length) {
    const message = json.errors.map((e: { message: string }) => e.message).join('\n')
    logServerError('shopify-admin', new Error(message))
    throw new Error(message)
  }
  return json.data
}

export type CustomerRxState = {
  /** Storage path of the uploaded document, or null when none on file. */
  documentPath: string | null
  verified: boolean
}

const GET_CUSTOMER_RX_STATE = `#graphql
  query GetCustomerRxState($id: ID!, $namespace: String!, $documentKey: String!, $verifiedKey: String!) {
    customer(id: $id) {
      document: metafield(namespace: $namespace, key: $documentKey) { value }
      verified: metafield(namespace: $namespace, key: $verifiedKey) { value }
    }
  }
`

export async function getCustomerRxState(customerId: string): Promise<CustomerRxState> {
  const data = await adminFetch<{
    customer: { document: { value: string } | null; verified: { value: string } | null } | null
  }>(GET_CUSTOMER_RX_STATE, {
    id: customerId,
    namespace: RX_METAFIELDS.namespace,
    documentKey: RX_METAFIELDS.documentKey,
    verifiedKey: RX_METAFIELDS.verifiedKey,
  })
  return {
    documentPath: data.customer?.document?.value ?? null,
    verified: data.customer?.verified?.value === 'true',
  }
}

const SET_CUSTOMER_RX_DOCUMENT = `#graphql
  mutation SetCustomerRxDocument($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`

/**
 * Records the uploaded document path on the customer. rx_verified is written
 * `false` only on first upload — a merchant-set true is never downgraded by
 * a re-upload (the enforcement companion reads that flag).
 */
export async function setCustomerRxDocument(customerId: string, documentPath: string): Promise<void> {
  const current = await getCustomerRxState(customerId)
  const metafields: Record<string, unknown>[] = [
    {
      ownerId: customerId,
      namespace: RX_METAFIELDS.namespace,
      key: RX_METAFIELDS.documentKey,
      type: 'single_line_text_field',
      value: documentPath,
    },
  ]
  if (!current.verified) {
    metafields.push({
      ownerId: customerId,
      namespace: RX_METAFIELDS.namespace,
      key: RX_METAFIELDS.verifiedKey,
      type: 'boolean',
      value: 'false',
    })
  }
  const data = await adminFetch<{
    metafieldsSet: { userErrors: { message: string }[] }
  }>(SET_CUSTOMER_RX_DOCUMENT, { metafields })
  const errors = data.metafieldsSet.userErrors
  if (errors.length) {
    throw new Error(`metafieldsSet: ${errors.map((e) => e.message).join(', ')}`)
  }
}
