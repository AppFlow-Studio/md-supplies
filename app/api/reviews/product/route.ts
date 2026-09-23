import { NextResponse } from 'next/server'
import { reviewSubmitSchema } from '@/lib/trustshop/write-schema'
import { getNumericShopifyProductId } from '@/lib/trustshop/product-id'
import { submitProductReview } from '@/lib/trustshop/product'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { GET_PRODUCT_EXISTS_BY_ID } from '@/lib/shopify/queries/products'
import { logServerError } from '@/lib/log-error'
import { isRateLimited, clientIp } from '@/lib/rate-limit'
import {
  assertAllowedOrigin,
  readJsonBounded,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'

const RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 } // 5 review submissions / IP / hour

async function productExists(gid: string): Promise<boolean> {
  try {
    const data = await storefrontFetch<{ product: { id: string } | null }>(
      GET_PRODUCT_EXISTS_BY_ID,
      { id: gid },
    )
    return data.product !== null
  } catch (err) {
    logServerError('reviews-product-exists', err)
    return false
  }
}

export async function POST(req: Request) {
  const origin = assertAllowedOrigin(req)
  if (!origin.ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  if (isRateLimited(`reviews:${clientIp(req)}`, RATE_LIMIT)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 },
    )
  }

  const read = await readJsonBounded(req)
  if (!read.ok) {
    const error = read.status === 413 ? 'Payload too large' : 'Invalid JSON'
    return NextResponse.json({ error }, { status: read.status })
  }

  // Silently accept (but never forward) bot submissions — same contract as
  // /api/contact, so scripted clients can't tell a drop from a real send.
  if (isHoneypotFilled(read.data) || isSubmittedTooFast(read.data)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = await reviewSubmitSchema.safeParseAsync(read.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: fieldErrors(parsed.error) },
      { status: 400 },
    )
  }

  const { productGid, star, title, content, name, email } = parsed.data

  let numericProductId: number
  try {
    numericProductId = getNumericShopifyProductId(productGid)
  } catch {
    return NextResponse.json({ error: 'Invalid product reference' }, { status: 400 })
  }

  if (!(await productExists(productGid))) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const result = await submitProductReview({
    shopifyProductId: numericProductId,
    star,
    content,
    name,
    email,
    ...(title ? { title } : {}),
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Unable to submit your review right now. Please try again later.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}
