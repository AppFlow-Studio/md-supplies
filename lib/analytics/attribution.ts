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

/**
 * Last-touch companion to ATTRIBUTION_COOKIE (DEV-TRACK-01).
 *
 * md_attr is first-touch and, by design, never overwritten — the contact and
 * sourcing lead emails want the campaign that originally found the customer.
 * But GA4 reports conversions on last-non-direct-click, and a vendor asking
 * "which of my two emails drove this order" means the most recent one. With
 * only md_attr, a customer who arrived via Jant campaign A in October and
 * bought via campaign B in November produced an order stamped A while GA4
 * credited B — two systems disagreeing with no way to reconcile them.
 *
 * This cookie is refreshed on every visit that carries campaign params, so
 * the pair together answer both questions and the Shopify order records both.
 */
export const LAST_TOUCH_COOKIE = 'md_attr_last'

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


/**
 * Prefix for the campaign attributes written onto the Shopify cart, and so
 * onto the Order. Namespaced so they are obviously ours in the Shopify admin
 * and can never collide with a Shopify- or app-reserved attribute key.
 */
const ATTR_PREFIX = 'md_'

/**
 * The campaign fields worth persisting onto a Shopify order.
 *
 * Deliberately a fixed allow-list, not "every tracking param we captured".
 * Cart attributes are visible to staff in the Shopify admin and travel into
 * order exports and notification templates, so the set that lands there is
 * chosen rather than inherited: the five UTMs answer the vendor-reporting
 * question, and the click IDs let a paid order be reconciled against the ad
 * platform. Anything else a proxy happened to capture stays in the cookie.
 */
const ORDER_ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'fbclid',
] as const

/** Shopify caps attribute values at 255 chars; a longer one rejects the whole
    cartAttributesUpdate mutation rather than truncating politely. */
const MAX_ATTRIBUTE_VALUE = 255

function pickOrderAttribution(
  attribution: Record<string, string>,
  prefix: string,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of ORDER_ATTRIBUTION_KEYS) {
    const value = attribution[key]
    if (typeof value === 'string' && value.length > 0) {
      out[`${prefix}${key}`] = value.slice(0, MAX_ATTRIBUTE_VALUE)
    }
  }
  return out
}

/**
 * Builds the Shopify cart attributes that carry campaign attribution onto the
 * order.
 *
 * This is the piece that makes vendor reporting answerable from Shopify rather
 * than only from GA4: GA4 can say "a jant/email session bought something", but
 * it cannot reliably tell you WHICH SKUs and quantities, at what discount, on
 * which order number — and its data is sampled, consent-gated and
 * cookie-dependent. A cart attribute is none of those things. It is recorded
 * server-side on the order itself and survives in the admin, exports and the
 * Orders API indefinitely.
 *
 * First-touch is prefixed `md_first_`, last-touch plain `md_` — the unprefixed
 * one being last-touch matches GA4's own default model, so the obvious-looking
 * `md_utm_source` agrees with what GA4 reports rather than contradicting it.
 */
export function buildOrderAttributionAttributes(params: {
  firstTouch: Record<string, string>
  lastTouch: Record<string, string>
}): Record<string, string> {
  // Last-touch falls back to first-touch: a single-visit customer has only one
  // campaign, and leaving md_utm_source blank there would read as "no campaign"
  // rather than "same campaign".
  const last = Object.keys(params.lastTouch).length > 0 ? params.lastTouch : params.firstTouch
  return {
    ...pickOrderAttribution(params.firstTouch, `${ATTR_PREFIX}first_`),
    ...pickOrderAttribution(last, ATTR_PREFIX),
  }
}

/** Server-only: reads the most recent campaign touch, if any. */
export async function readLastTouchAttribution(): Promise<Record<string, string>> {
  const store = await cookies()
  return parseAttribution(store.get(LAST_TOUCH_COOKIE)?.value)
}
