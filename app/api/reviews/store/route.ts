import { NextResponse } from 'next/server'
import { storeReviewSubmitSchema } from '@/lib/trustshop/store-write-schema'
import { submitStoreReview } from '@/lib/trustshop/store'
import { isRateLimited, clientIp } from '@/lib/rate-limit'
import {
  assertAllowedOrigin,
  readJsonBounded,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'

const RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 } // 5 review submissions / IP / hour

// Deliberately a separate route from /api/reviews/product (not a shared
// route with an optional product field) — store and product reviews must
// never be conflated, per the ticket.
export async function POST(req: Request) {
  const origin = assertAllowedOrigin(req)
  if (!origin.ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  if (isRateLimited(`reviews-store:${clientIp(req)}`, RATE_LIMIT)) {
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
  // /api/contact and /api/reviews/product.
  if (isHoneypotFilled(read.data) || isSubmittedTooFast(read.data)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = await storeReviewSubmitSchema.safeParseAsync(read.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: fieldErrors(parsed.error) },
      { status: 400 },
    )
  }

  const { star, title, content, name, email } = parsed.data

  const result = await submitStoreReview({
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
