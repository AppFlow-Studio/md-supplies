import { cacheLife } from 'next/cache'

// Offer freshness hint (M6): the price is advertised as valid ~30 days out, in
// date-only form per Google's structured-data examples. Under Cache Components
// the current time cannot be read during a static render
// (next-prerender-current-time), so this lives in a `use cache` scope — the value
// is computed once per cache generation and rolls forward daily (cacheLife
// 'days'), reproducing the rolling window the old per-request ISR render gave us.
// Shared by /product/[slug] and /category/[slug]/[product] (identical helper
// previously duplicated in both).
export async function getPriceValidUntil(): Promise<string> {
  'use cache'
  cacheLife('days')
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
