import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env.server'
import { RX_STORAGE_PREFIX } from '@/lib/rx-storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  if (path.some((segment) => segment === '..' || segment === '.' || segment === '')) {
    return new NextResponse(null, { status: 400 })
  }

  // RX prescription documents are sensitive PII stored on the same zone —
  // they must never be reachable through this public proxy. Owners fetch
  // their own document via the authenticated /api/account/rx-document route.
  if (path[0] === RX_STORAGE_PREFIX) {
    return new NextResponse(null, { status: 404 })
  }

  const upstreamUrl = `https://${serverEnv.bunnyCdnHostname}/${serverEnv.bunnyCdnZone}/${path.map(encodeURIComponent).join('/')}`
  const upstream = await fetch(upstreamUrl, { headers: { AccessKey: serverEnv.bunnyCdnAccessKey } })

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
