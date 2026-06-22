import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  if (path.some((segment) => segment === '..' || segment === '.' || segment === '')) {
    return new NextResponse(null, { status: 400 })
  }

  const accessKey = process.env.BUNNYCDN_STORAGE_ACCESS_KEY
  const hostname = process.env.BUNNYCDN_STORAGE_HOSTNAME
  const zone = process.env.BUNNYCDN_STORAGE_ZONE

  if (!accessKey || !hostname || !zone) {
    return new NextResponse(null, { status: 404 })
  }

  const upstreamUrl = `https://${hostname}/${zone}/${path.map(encodeURIComponent).join('/')}`
  const upstream = await fetch(upstreamUrl, { headers: { AccessKey: accessKey } })

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
