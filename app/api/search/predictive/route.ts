import { NextRequest, NextResponse } from 'next/server'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { PREDICTIVE_SEARCH } from '@/lib/shopify/queries/search'
import { assertNoForeignOrigin } from '@/lib/forms/guards'
import { isRateLimited, clientIp } from '@/lib/rate-limit'

// The client debounces keystrokes at 280ms (~3.5 req/s max), so 60/min per IP
// leaves generous headroom for real users while capping scripted loops.
const RATE_LIMIT = { limit: 60, windowMs: 60_000 }
import { getAllowedHandles } from '@/lib/category-nav'

export interface PredictiveProduct {
  id: string
  title: string
  handle: string
  featuredImage: { url: string; altText: string | null } | null
}

export interface PredictiveCollection {
  id: string
  title: string
  handle: string
}

export interface PredictiveQuery {
  text: string
  styledText: string
}

export interface PredictiveResults {
  products: PredictiveProduct[]
  collections: PredictiveCollection[]
  queries: PredictiveQuery[]
}

const MAX_Q_LENGTH = 100

export async function GET(req: NextRequest) {
  if (!assertNoForeignOrigin(req).ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  if (isRateLimited(`predictive:${clientIp(req)}`, RATE_LIMIT)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_Q_LENGTH)

  if (q.length < 2) {
    return NextResponse.json<PredictiveResults>({ products: [], collections: [], queries: [] })
  }

  try {
    const data = await storefrontFetch<{ predictiveSearch: PredictiveResults }>(
      PREDICTIVE_SEARCH,
      { q, limit: 6 },
      { cache: 'no-store' },
    )
    // NF4: predictiveSearch returns every matching collection verbatim,
    // including internal/ops collections deliberately absent from the nav
    // registry. Gate against the same allowlist the header nav uses.
    const allowedHandles = getAllowedHandles()
    return NextResponse.json<PredictiveResults>({
      ...data.predictiveSearch,
      collections: data.predictiveSearch.collections.filter((c) => allowedHandles.has(c.handle)),
    })
  } catch {
    return NextResponse.json<PredictiveResults>({ products: [], collections: [], queries: [] })
  }
}
