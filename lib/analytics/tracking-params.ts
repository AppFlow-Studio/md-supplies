/**
 * Marketing / referral attribution query params that must survive client-side
 * navigation so that GTM/GA4 and referrer reports keep attributing sessions to
 * the correct source (e.g. Bing Ads `msclkid`, ChatGPT `utm_source=chatgpt.com`).
 *
 * Canonical URLs still strip these — see `lib/seo/canonical.ts`. This helper is
 * only about not *losing* them when we rebuild the query string during in-app
 * navigation (filters, sort, pagination, search).
 */

/** Prefix-matched families. Any key starting with one of these is tracking. */
const TRACKING_PARAM_PREFIXES = ['utm_'] as const

/** Exact-match ad click identifiers, keyed by platform. */
const TRACKING_PARAM_KEYS = new Set<string>([
  'gclid', // Google Ads
  'gbraid', // Google Ads (app → web, iOS)
  'wbraid', // Google Ads (web → app)
  'dclid', // Google Display / DV360
  'msclkid', // Microsoft / Bing Ads
  'fbclid', // Meta / Facebook
  'ttclid', // TikTok
  'twclid', // X / Twitter
  'li_fat_id', // LinkedIn
  'yclid', // Yandex
  'igshid', // Instagram
  'mc_cid', // Mailchimp campaign
  'mc_eid', // Mailchimp email
])

/**
 * A source of query params. Accepts a `URLSearchParams` (or Next's
 * `ReadonlyURLSearchParams`, which is duck-typed via `entries()`) or the plain
 * record produced by `await searchParams` in a server component.
 */
export type TrackingParamSource =
  | URLSearchParams
  | { entries(): IterableIterator<[string, string]> }
  | Record<string, string | string[] | undefined>

/** Returns true when `key` names a marketing/referral tracking param. */
export function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase()
  return TRACKING_PARAM_PREFIXES.some((prefix) => k.startsWith(prefix)) || TRACKING_PARAM_KEYS.has(k)
}

function toEntries(source: TrackingParamSource): [string, string][] {
  if (typeof (source as { entries?: unknown }).entries === 'function') {
    return [...(source as URLSearchParams).entries()]
  }
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(source as Record<string, string | string[] | undefined>)) {
    if (Array.isArray(value)) value.forEach((v) => out.push([key, v]))
    else if (value != null) out.push([key, value])
  }
  return out
}

/** Extracts the `[key, value]` pairs from `source` that are tracking params. */
export function extractTrackingParams(source: TrackingParamSource): [string, string][] {
  return toEntries(source).filter(([key]) => isTrackingParam(key))
}

/**
 * Merges tracking params from `source` into `target`, skipping any key already
 * present on `target`. Mutates and returns `target` for chaining.
 */
export function withTrackingParams(target: URLSearchParams, source: TrackingParamSource): URLSearchParams {
  for (const [key, value] of extractTrackingParams(source)) {
    if (!target.has(key)) target.append(key, value)
  }
  return target
}
