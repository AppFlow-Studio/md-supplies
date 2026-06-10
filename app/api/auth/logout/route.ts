import { NextResponse } from 'next/server'
import { SESSION_COOKIES } from '@/lib/shopify/session'

export async function GET() {
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const response = NextResponse.redirect(`${siteUrl}/account`)
  response.cookies.delete(SESSION_COOKIES.ACCESS_TOKEN)
  response.cookies.delete(SESSION_COOKIES.REFRESH_TOKEN)
  response.cookies.delete(SESSION_COOKIES.EXPIRES_AT)
  return response
}
