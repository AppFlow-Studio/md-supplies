'use server'

import { cookies } from 'next/headers'

export async function setMarketCountry(isoCode: string) {
  const cookieStore = await cookies()
  cookieStore.set('market_country', isoCode, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
