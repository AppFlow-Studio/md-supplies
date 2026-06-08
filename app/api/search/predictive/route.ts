import { NextRequest, NextResponse } from 'next/server'
import { storefrontFetch } from '@/lib/shopify/storefront'
import { PREDICTIVE_SEARCH } from '@/lib/shopify/queries/search'

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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json<PredictiveResults>({ products: [], collections: [], queries: [] })
  }

  try {
    const data = await storefrontFetch<{ predictiveSearch: PredictiveResults }>(
      PREDICTIVE_SEARCH,
      { q, limit: 6 },
      { cache: 'no-store' },
    )
    return NextResponse.json<PredictiveResults>(data.predictiveSearch)
  } catch {
    return NextResponse.json<PredictiveResults>({ products: [], collections: [], queries: [] })
  }
}
