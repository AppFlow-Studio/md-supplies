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

  const objectPath = path.map(encodeURIComponent).join('/')
  const upstreamUrl = `https://${serverEnv.bunnyCdnHostname}/${serverEnv.bunnyCdnZone}/${objectPath}`

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, { headers: { AccessKey: serverEnv.bunnyCdnAccessKey } })
  } catch (err) {
    // Network/DNS failure reaching Bunny — distinct from a missing object.
    console.error(
      `[bunny] upstream unreachable zone=${serverEnv.bunnyCdnZone} host=${serverEnv.bunnyCdnHostname} path=${objectPath}: ${(err as Error).message}`,
    )
    return new NextResponse(null, { status: 404 })
  }

  if (!upstream.ok || !upstream.body) {
    // Diagnostics: previously EVERY upstream status collapsed into a bare 404,
    // so a store-wide credential failure was indistinguishable from one absent
    // file. On 2026-08-02 that hid a 401 (invalid storage AccessKey) behind
    // "missing image" for the logo and every category banner.
    //
    // The AccessKey itself is never logged — only whether one is configured.
    if (upstream.status === 401 || upstream.status === 403) {
      console.error(
        `[bunny] AUTH FAILURE ${upstream.status} — the storage AccessKey is rejected by Bunny. ` +
          `This is a configuration problem, not a missing object; every asset on this zone will fail. ` +
          `zone=${serverEnv.bunnyCdnZone} host=${serverEnv.bunnyCdnHostname} keyConfigured=${Boolean(serverEnv.bunnyCdnAccessKey)} path=${objectPath}`,
      )
    } else if (upstream.status >= 500) {
      console.error(`[bunny] upstream ${upstream.status} (Bunny-side error) path=${objectPath}`)
    } else if (upstream.status !== 404) {
      console.warn(`[bunny] unexpected upstream ${upstream.status} path=${objectPath}`)
    }
    // Clients always see 404: upstream status is never leaked to the browser.
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
