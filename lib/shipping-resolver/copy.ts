import type { PublicDisplayClass } from './schema'

// The exact required fallback string (DEV-SHIP-01 acceptance criteria) — one
// constant, used by every invalid/missing/duplicate/unknown/held/failed path.
export const SHIPPING_FALLBACK_MESSAGE = 'Shipping calculated at checkout.'

// Placeholder copy — NOT approved for customer display (ticket item6,
// blocked on Bilal). standard-paid/manual-quote/unknown intentionally map to
// null so they fall through to SHIPPING_FALLBACK_MESSAGE, which is equally
// true for a paid shipment (checkout still calculates the exact price).
// Editing this object is the only change needed once wording is approved.
export const SHIPPING_CLASS_COPY: Record<PublicDisplayClass, string | null> = {
  'standard-free': 'Free shipping',
  threshold: 'Free shipping over a vendor minimum — see checkout for details',
  'standard-paid': null,
  'manual-quote': null,
  unknown: null,
}

// Badge label shown on cards/quick-add/PDP. Only classes with a badge appear
// here — standard-paid/manual-quote/unknown render no badge at all (silent).
export const SHIPPING_CLASS_BADGE_LABEL: Partial<Record<PublicDisplayClass, string>> = {
  'standard-free': 'Free Shipping',
  threshold: 'Free Shipping Available',
}
