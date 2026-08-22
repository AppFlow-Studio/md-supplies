import type { PublicDisplayClass } from './schema'

// The exact required fallback string (DEV-SHIP-01 acceptance criteria) — one
// constant, used by every invalid/missing/duplicate/unknown/held/failed path.
export const SHIPPING_FALLBACK_MESSAGE = 'Shipping calculated at checkout.'

// A class only gets wording here once that wording is approved. Anything null
// falls through to SHIPPING_FALLBACK_MESSAGE, which is true for every class:
// checkout always calculates the real charge.
//
// standard-free states what the registry already asserts, so it needs no
// qualifier. standard-paid and manual-quote stay null because naming a price
// we have not verified is exactly the promise we cannot keep.
//
// threshold previously read "Free shipping over a vendor minimum", which was
// wrong twice over: it was never approved wording, and "over" misstates the
// rule. Test E01 shows the condition is >=, so a cart at exactly $30.00
// qualifies and "over $30" would under-promise at the boundary. Bilal
// approved "Free Shipping on orders $30+" on 2026-08-19 — the "+" reads as
// inclusive, clearing that objection.
//
// One objection this approval does NOT resolve: the confirmed policy is
// narrower than "a vendor minimum" — it applies to merchandise actually
// FULFILLED by Dukal, not to everything carrying the Dukal brand, a
// distinction this resolver cannot yet make. Bilal has ruled the label
// vendor-based (his call to make), so this ships as approved; the mismatch is
// his to revisit, not a reason to withhold the copy.
export const SHIPPING_CLASS_COPY: Record<PublicDisplayClass, string | null> = {
  'standard-free': 'Free shipping',
  threshold: 'Free Shipping on orders $30+',
  'standard-paid': null,
  'manual-quote': null,
  unknown: null,
}

// Badge shown on cards/quick-add/PDP. A badge is a promise in three words with
// no room for a condition, so only a class that is unconditionally true gets
// one. threshold stays OUT of this map on purpose, even though it now has
// approved copy above: "Free Shipping Available" implies an unconditional
// entitlement, which threshold is not. Keeping it out of the badge is what
// makes the conditional wording visually distinct from the unconditional
// badge, per Bilal's requirement.
export const SHIPPING_CLASS_BADGE_LABEL: Partial<Record<PublicDisplayClass, string>> = {
  'standard-free': 'Free Shipping',
}
