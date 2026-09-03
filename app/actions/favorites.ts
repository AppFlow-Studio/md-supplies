'use server'
import 'server-only'

import { getSession } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { storefrontFetch } from '@/lib/shopify/storefront'
import {
  getCustomerFavorites,
  addCustomerFavorite,
  removeCustomerFavorite,
  pruneCustomerFavorites,
} from '@/lib/shopify/favorites-admin'
import { GET_PRODUCTS_BY_IDS } from '@/lib/shopify/queries/products'
import type { CollectionProduct } from '@/lib/shopify/types'

const GET_CUSTOMER_ID = `#graphql
  query GetFavoritesCustomerId { customer { id } }
`

async function getCustomerId(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  try {
    const data = await customerFetch<{ customer: { id: string } | null }>(
      GET_CUSTOMER_ID,
      session.accessToken,
    )
    return data.customer?.id ?? null
  } catch {
    return null
  }
}

/**
 * The set of product IDs the signed-in customer has favorited, for hydrating
 * heart state across many cards from ONE read (never a per-card fetch — see
 * ProductGrid/CategoryResults/SearchResultsSection callers). Guest visitors
 * never reach getSession()'s cookie read cost beyond the cheap `!session`
 * check below, and never touch the Admin API at all.
 */
export async function getFavoritedProductIds(): Promise<string[]> {
  const customerId = await getCustomerId()
  if (!customerId) return []
  try {
    const favorites = await getCustomerFavorites(customerId)
    return favorites.map((f) => f.productId)
  } catch (err) {
    console.error('[favorites] getFavoritedProductIds failed:', err)
    return []
  }
}

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: string }

/**
 * Flips the favorite state for one product. Idempotent at the storage layer
 * (lib/shopify/favorites-admin.ts) — a duplicate add or a remove-when-absent
 * both resolve to the same final state without creating a second record.
 */
export async function toggleFavorite(
  productId: string,
  variantId: string | null,
): Promise<ToggleFavoriteResult> {
  const customerId = await getCustomerId()
  if (!customerId) return { ok: false, error: 'Please sign in to save favorites.' }
  if (!productId) return { ok: false, error: 'Missing product.' }

  try {
    const current = await getCustomerFavorites(customerId)
    const alreadyFavorited = current.some((r) => r.productId === productId)
    if (alreadyFavorited) {
      await removeCustomerFavorite(customerId, productId)
      return { ok: true, favorited: false }
    }
    await addCustomerFavorite(customerId, productId, variantId)
    return { ok: true, favorited: true }
  } catch (err) {
    console.error('[favorites] toggleFavorite failed:', err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

/** Explicit remove for the account Favorites page — idempotent, never errors on an absent id. */
export async function removeFavoriteAction(productId: string): Promise<{ ok: boolean }> {
  const customerId = await getCustomerId()
  if (!customerId) return { ok: false }
  try {
    await removeCustomerFavorite(customerId, productId)
    return { ok: true }
  } catch (err) {
    console.error('[favorites] removeFavoriteAction failed:', err)
    return { ok: false }
  }
}

export type AccountFavoritesResult = {
  signedIn: boolean
  products: CollectionProduct[]
}

/**
 * Resolves the signed-in customer's favorites to live card data for the
 * account Favorites view — through GET_PRODUCTS_BY_IDS, the SAME
 * PRODUCT_CARD_FRAGMENT every collection/search grid uses, so pricing and
 * purchasability here can never disagree with the rest of the site (never a
 * second computation). A favorite whose product no longer resolves (deleted,
 * or not visible to the Storefront API — unpublished/archived) is dropped
 * from the rendered list AND pruned from the stored record, so it can't
 * silently reappear (Product lifecycle edge cases, DEV-FAV-01).
 */
export async function getAccountFavorites(): Promise<AccountFavoritesResult> {
  const customerId = await getCustomerId()
  if (!customerId) return { signedIn: false, products: [] }

  try {
    const favorites = await getCustomerFavorites(customerId)
    if (favorites.length === 0) return { signedIn: true, products: [] }

    const data = await storefrontFetch<{ nodes: (CollectionProduct | null)[] }>(
      GET_PRODUCTS_BY_IDS,
      { ids: favorites.map((f) => f.productId) },
      { cache: 'no-store' },
    )
    const resolved = data.nodes.filter((p): p is CollectionProduct => p != null)

    // Best-effort cleanup — a failure here must never break the page render,
    // the customer just sees the same orphan again on a later visit.
    const validIds = new Set(resolved.map((p) => p.id))
    if (validIds.size !== favorites.length) {
      pruneCustomerFavorites(customerId, validIds).catch((err) =>
        console.error('[favorites] pruneCustomerFavorites failed:', err),
      )
    }

    // Newest-favorited-first, independent of whatever order Shopify's nodes()
    // happened to return.
    const order = new Map(favorites.map((f, i) => [f.productId, i]))
    resolved.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    resolved.reverse()

    return { signedIn: true, products: resolved }
  } catch (err) {
    console.error('[favorites] getAccountFavorites failed:', err)
    return { signedIn: true, products: [] }
  }
}
