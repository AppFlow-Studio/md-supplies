import type { NextRequest } from 'next/server'

const GONE_PATHS: string[] = [
  // Permanently removed URLs — data team adds entries here
]

export function proxy(request: NextRequest) {
  if (GONE_PATHS.includes(request.nextUrl.pathname)) {
    return new Response(null, { status: 410 })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
