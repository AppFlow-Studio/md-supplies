import { cookies } from 'next/headers'
import { extractTrackingParams, type TrackingParamSource } from './tracking-params'

/**
 * DEV-LAUNCH-12: withTrackingParams() (tracking-params.ts) only echoes gclid/
 * utm_* through the querystring of same-page discovery navigation (filter,
 * sort, search, pagination) — it never survives the first click off that page
 * (e.g. into a product or /cart), because nothing stores it. This module is
 * the durable side: a first-party, first-touch cookie captured once in
 * proxy.ts and read back wherever attribution is needed server-side (today:
 * the contact/sourcing lead emails, so a sales rep can see which campaign
 * produced a lead).
 *
 * Deliberately NOT a replacement for ad-platform conversion tracking: Google
 * Ads/Bing attribution is normally handled by GTM's own Conversion Linker tag
 * writing its own first-party cookies (_gcl_au etc.), which is a GTM container
 * config concern outside this repo and unverifiable from source — flagged
 * separately in the DEV-LAUNCH-12 verification doc.
 */
export const ATTRIBUTION_COOKIE = 'md_attr'

/** 90 days — the longest common ad-platform attribution lookback window. */
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

export function serializeAttribution(source: TrackingParamSource): string | null {
  const params = extractTrackingParams(source)
  if (params.length === 0) return null
  return JSON.stringify(Object.fromEntries(params))
}

function parseAttribution(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => typeof v === 'string'),
      ) as Record<string, string>
    }
  } catch {
    // Malformed/tampered cookie — treat as no attribution rather than throw.
  }
  return {}
}

/** Server-only: reads the captured first-touch attribution, if any. */
export async function readStoredAttribution(): Promise<Record<string, string>> {
  const store = await cookies()
  return parseAttribution(store.get(ATTRIBUTION_COOKIE)?.value)
}

/** Formats stored attribution as a plain-text line for a lead email, or ''. */
export function formatAttributionLine(attribution: Record<string, string>): string {
  const entries = Object.entries(attribution)
  if (entries.length === 0) return ''
  return `Attribution:  ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`
}
