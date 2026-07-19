'use server'
import 'server-only'

import { cookies } from 'next/headers'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { CART_BUYER_IDENTITY_UPDATE, GET_CART } from '@/lib/shopify/queries/cart'
import { getSession } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { getCustomerRxState, setCustomerRxDocument } from '@/lib/shopify/admin'
import {
  buildRxDocumentPath,
  customerFolderId,
  deleteRxDocument,
  putRxDocument,
  sniffRxContentType,
  RX_ALLOWED_TYPES,
  RX_MAX_FILE_BYTES,
} from '@/lib/rx-storage'
import { cartRequiresRxGate, resolveGateStatus, type RxGateStatus } from '@/lib/rx-gate'
import type { Cart } from '@/lib/shopify/types'

const CART_COOKIE = 'cart_id'
const NO_STORE = { cache: 'no-store' } as const

const GET_CUSTOMER_ID = `#graphql
  query GetCustomerId { customer { id } }
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

async function fetchCart(): Promise<Cart | null> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) return null
  try {
    const data = await storefrontFetch<{ cart: Cart | null }>(GET_CART, { cartId }, NO_STORE)
    return data.cart
  } catch {
    return null
  }
}

/** Gate verdict for the cart UIs (UX layer — enforcement is the companion app). */
export async function getRxGateStatus(): Promise<RxGateStatus> {
  const cart = await fetchCart()
  const cartHasRx = cart ? cartRequiresRxGate(cart.lines.nodes) : false
  if (!cartHasRx) {
    return resolveGateStatus({ cartHasRx, signedIn: false, hasDocument: false, verified: false })
  }

  const customerId = await getCustomerId()
  if (!customerId) {
    return resolveGateStatus({ cartHasRx, signedIn: false, hasDocument: false, verified: false })
  }

  try {
    const state = await getCustomerRxState(customerId)
    return resolveGateStatus({
      cartHasRx,
      signedIn: true,
      hasDocument: state.documentPath != null,
      verified: state.verified,
    })
  } catch (err) {
    // Admin API unavailable (e.g. token not yet provisioned): fail CLOSED for
    // RX carts — blocking a sale is recoverable, an ungated RX sale is not.
    console.error('[rx] getCustomerRxState failed:', err)
    return resolveGateStatus({ cartHasRx, signedIn: true, hasDocument: false, verified: false })
  }
}

export type PrepareCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; status: RxGateStatus }

/**
 * Runs before EVERY checkout handoff (both cart surfaces):
 *  1. re-checks the RX gate server-side (the CTA state is stale by nature),
 *  2. associates the signed-in customer with the cart via
 *     cartBuyerIdentityUpdate — the hinge that lets checkout and the future
 *     validation app read compliance.rx_verified.
 */
export async function prepareCheckout(): Promise<PrepareCheckoutResult> {
  const status = await getRxGateStatus()
  if (status.blocked) return { ok: false, status }

  const jar = await cookies()
  const cartId = jar.get(CART_COOKIE)?.value
  if (!cartId) throw new Error('No cart')

  const session = await getSession()
  let cart: Cart | null = null

  if (session) {
    try {
      const data = await storefrontFetch<{
        cartBuyerIdentityUpdate: { cart: Cart; userErrors: { message: string }[] }
      }>(
        CART_BUYER_IDENTITY_UPDATE,
        { cartId, buyerIdentity: { customerAccessToken: session.accessToken } },
        NO_STORE,
      )
      if (data.cartBuyerIdentityUpdate.userErrors.length) {
        console.error(
          '[rx] cartBuyerIdentityUpdate userErrors:',
          data.cartBuyerIdentityUpdate.userErrors.map((e) => e.message).join(', '),
        )
      }
      cart = data.cartBuyerIdentityUpdate.cart
    } catch (err) {
      // Non-RX carts may proceed without association (guest checkout stays
      // open for them); RX carts never reach here signed-out because the
      // gate above blocks first.
      console.error('[rx] cartBuyerIdentityUpdate failed:', err)
    }
  }

  if (!cart) cart = await fetchCart()
  if (!cart) throw new Error('Cart not found')
  return { ok: true, checkoutUrl: cart.checkoutUrl }
}

export type UploadRxDocumentResult =
  | { ok: true }
  | { ok: false; error: string }

/** Account-level RX document upload (form action). Auth required. */
export async function uploadRxDocument(formData: FormData): Promise<UploadRxDocumentResult> {
  const customerId = await getCustomerId()
  if (!customerId) return { ok: false, error: 'Please sign in to upload a prescription document.' }

  const file = formData.get('rx-document')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Please choose a file to upload.' }
  }
  if (!(file.type in RX_ALLOWED_TYPES)) {
    return { ok: false, error: 'Unsupported file type. Please upload a PDF, JPG, PNG, or WebP file.' }
  }
  if (file.size > RX_MAX_FILE_BYTES) {
    return { ok: false, error: 'File is too large. The maximum size is 10 MB.' }
  }

  const body = await file.arrayBuffer()
  // The declared MIME type is attacker-controlled; the stored type comes from
  // the file's own magic bytes or the upload is refused (forged-MIME threat).
  const sniffedType = sniffRxContentType(body)
  if (!sniffedType) {
    return { ok: false, error: 'Unsupported file type. Please upload a PDF, JPG, PNG, or WebP file.' }
  }

  try {
    // Replacement invalidates any prior verification: the merchant verified
    // the OLD file. Read the previous state before writing the new one.
    const previous = await getCustomerRxState(customerId).catch(() => null)
    const previousPath = previous?.documentPath ?? null

    const path = buildRxDocumentPath(customerId, sniffedType)
    await putRxDocument(path, body, sniffedType)
    await setCustomerRxDocument(customerId, path, { resetVerified: previousPath != null })
    console.info(
      `[rx-audit] document_uploaded customer=${customerFolderId(customerId)} replaced=${previousPath != null}`,
    )

    // Retention: exactly one live document per customer. Best-effort delete
    // of the superseded blob; a failure is logged for manual cleanup, never
    // surfaced to the customer (their upload already succeeded).
    if (previousPath && !(await deleteRxDocument(previousPath))) {
      console.error(`[rx-audit] stale_document_delete_failed customer=${customerFolderId(customerId)}`)
    }
    return { ok: true }
  } catch (err) {
    console.error('[rx] uploadRxDocument failed:', err)
    return { ok: false, error: 'Upload failed. Please try again or contact support.' }
  }
}

export type RxAccountState = {
  signedIn: boolean
  hasDocument: boolean
  verified: boolean
}

/** Document state for the account page card. */
export async function getRxAccountState(): Promise<RxAccountState> {
  const customerId = await getCustomerId()
  if (!customerId) return { signedIn: false, hasDocument: false, verified: false }
  try {
    const state = await getCustomerRxState(customerId)
    return { signedIn: true, hasDocument: state.documentPath != null, verified: state.verified }
  } catch (err) {
    console.error('[rx] getRxAccountState failed:', err)
    return { signedIn: true, hasDocument: false, verified: false }
  }
}
