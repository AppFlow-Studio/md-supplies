import crypto from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { serverEnv } from '@/lib/env.server'
import { logServerError } from '@/lib/log-error'
import { submitUrlToIndexNow } from '@/lib/seo/indexnow'
import { SITE_URL } from '@/lib/seo/constants'
import { getL1ByCollectionHandle, getCategorySlug } from '@/lib/category-tree'

// Shopify webhook receiver → on-demand cache invalidation (audit H1/M25).
//
// Point Shopify webhooks (products/create, products/update, products/delete,
// collections/create, collections/update, collections/delete) at
// POST /api/revalidate. The payload's HMAC is verified against
// SHOPIFY_WEBHOOK_SECRET, then the matching cache tags are revalidated with
// stale-while-revalidate semantics ('max' profile): the broad entity tag
// ('products' / 'collections') plus the per-handle tag when the payload
// carries a handle (delete payloads only carry an id).
//
// Tags are attached at the storefrontFetch call sites — see
// app/product/[slug], app/category/[slug], app/layout.tsx, etc.

function verifyShopifyHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false
  const digest = crypto
    .createHmac('sha256', serverEnv.shopifyWebhookSecret)
    .update(rawBody, 'utf8')
    .digest('base64')
  const a = Buffer.from(digest)
  const b = Buffer.from(hmacHeader)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return Response.json({ error: 'Unreadable body' }, { status: 400 })
  }

  try {
    if (!verifyShopifyHmac(rawBody, request.headers.get('x-shopify-hmac-sha256'))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch (err) {
    // Missing SHOPIFY_WEBHOOK_SECRET — misconfiguration, not a bad request.
    logServerError('revalidate-webhook', err)
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const topic = request.headers.get('x-shopify-topic') ?? ''
  let handle: string | undefined
  try {
    handle = (JSON.parse(rawBody) as { handle?: string }).handle
  } catch {
    // Tolerate an unparseable payload — the broad tag still revalidates.
  }

  const revalidated: string[] = []
  const invalidate = (tag: string) => {
    revalidateTag(tag, 'max')
    revalidated.push(tag)
  }

  if (topic.startsWith('products/')) {
    invalidate('products')
    if (handle) invalidate(`product:${handle}`)
    // A product save can change which collections it belongs to (tag/category
    // edits), but the webhook payload never carries collection membership —
    // only collections/* webhooks name a handle. Invalidating the broad
    // 'collections' tag (not a specific collection:<handle>) is the cheap,
    // correct fallback: every category page's next request revalidates
    // instead of waiting up to the 300s background window. Previously this
    // gap meant a tag/category edit could take up to 5 minutes to appear on
    // the storefront, which read to the client as the SAVE causing a delayed
    // appearance rather than the cache window.
    invalidate('collections')
    // Fire-and-forget: never await-block the webhook response on IndexNow's
    // own availability. handle is only present on create/update payloads,
    // not delete (matches the existing per-handle revalidateTag behavior
    // above) — a delete still gets the broad 'products'/'collections' cache
    // invalidation, just no IndexNow ping for a URL that's going away.
    if (handle) void submitUrlToIndexNow(`${SITE_URL}/product/${handle}`)
  } else if (topic.startsWith('collections/')) {
    invalidate('collections')
    if (handle) {
      invalidate(`collection:${handle}`)
      // A collection's public slug can diverge from its Shopify handle
      // (e.g. face-coverings -> /category/face-masks) — resolve through the
      // same registry proxy.ts and the sitemap use, never guess /category/<handle>.
      const l1 = getL1ByCollectionHandle(handle)
      if (l1) void submitUrlToIndexNow(`${SITE_URL}/category/${getCategorySlug(l1)}`)
    }
  } else {
    return Response.json({ revalidated, ignoredTopic: topic })
  }

  return Response.json({ revalidated, topic })
}
