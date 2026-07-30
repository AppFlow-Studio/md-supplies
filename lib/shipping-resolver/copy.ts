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
// threshold is null DELIBERATELY. It previously read "Free shipping over a
// vendor minimum", which was wrong twice over: it was never approved wording,
// and "over" misstates the rule. Test E01 shows the condition is >=, so a cart
// at exactly $30.00 qualifies and "over $30" would under-promise at the
// boundary. The confirmed policy is also narrower than "a vendor minimum": it
// applies to merchandise actually FULFILLED by Dukal, not to everything
// carrying the Dukal brand, which is a distinction this resolver cannot yet
// make. Threshold wording stays blocked until the exact copy is written and
// approved; until then a threshold product shows the neutral fallback.
export const SHIPPING_CLASS_COPY: Record<PublicDisplayClass, string | null> = {
  'standard-free': 'Free shipping',
  threshold: null,
  'standard-paid': null,
  'manual-quote': null,
  unknown: null,
}

// Badge shown on cards/quick-add/PDP. A badge is a promise in three words with
// no room for a condition, so only a class that is unconditionally true gets
// one. threshold is excluded for the same reason its copy is null: "Free
// Shipping Available" implies an entitlement whose condition it cannot state.
export const SHIPPING_CLASS_BADGE_LABEL: Partial<Record<PublicDisplayClass, string>> = {
  'standard-free': 'Free Shipping',
}
