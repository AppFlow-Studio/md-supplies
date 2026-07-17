import { NextResponse } from 'next/server'
import { getSession } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { getCustomerRxState } from '@/lib/shopify/admin'
import { fetchRxDocument, isOwnRxDocumentPath } from '@/lib/rx-storage'

// Serves the signed-in customer their OWN RX document — the only read path
// for rx-documents/* (the public bunny proxy denies the prefix). No path
// input is accepted from the request: the path always comes from the
// customer's own metafield, so one account can never address another's file.

const GET_CUSTOMER_ID = `#graphql
  query GetCustomerId { customer { id } }
`

export async function GET() {
  const session = await getSession()
  if (!session) return new NextResponse(null, { status: 401 })

  let customerId: string
  try {
    const data = await customerFetch<{ customer: { id: string } | null }>(
      GET_CUSTOMER_ID,
      session.accessToken,
    )
    if (!data.customer) return new NextResponse(null, { status: 401 })
    customerId = data.customer.id
  } catch {
    return new NextResponse(null, { status: 401 })
  }

  const state = await getCustomerRxState(customerId).catch(() => null)
  if (!state?.documentPath) return new NextResponse(null, { status: 404 })
  // Defense in depth: the metafield value must sit inside this customer's
  // own folder before we touch storage with it.
  if (!isOwnRxDocumentPath(state.documentPath, customerId)) {
    return new NextResponse(null, { status: 404 })
  }

  const doc = await fetchRxDocument(state.documentPath)
  if (!doc) return new NextResponse(null, { status: 404 })

  return new NextResponse(doc.body, {
    status: 200,
    headers: {
      'Content-Type': doc.contentType,
      // PII: never cache in shared caches; keep browser caching off too.
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline; filename="rx-document"',
    },
  })
}
