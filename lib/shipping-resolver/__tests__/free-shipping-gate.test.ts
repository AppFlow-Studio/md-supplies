import { describe, it, expect } from 'vitest'
import { isFreeShippingMetafieldTrue, gateFreeShippingClaim, gateFreeShippingClaims } from '../free-shipping-gate'
import { FALLBACK } from '../resolve'
import type { ShippingDisplay } from '../resolve'

const STANDARD_FREE: ShippingDisplay = { class: 'standard-free', message: 'Free shipping', displayCopy: null }
const THRESHOLD: ShippingDisplay = { class: 'threshold', message: 'Shipping calculated at checkout.', displayCopy: null }
const STANDARD_PAID: ShippingDisplay = { class: 'standard-paid', message: 'Shipping calculated at checkout.', displayCopy: '$45.95 flat rate' }
const MANUAL_QUOTE: ShippingDisplay = { class: 'manual-quote', message: 'Shipping calculated at checkout.', displayCopy: null }
const UNKNOWN: ShippingDisplay = { class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null }

describe('isFreeShippingMetafieldTrue', () => {
  it('recognizes truthy raw/string/boolean shapes', () => {
    expect(isFreeShippingMetafieldTrue({ value: 'true' })).toBe(true)
    expect(isFreeShippingMetafieldTrue('1')).toBe(true)
    expect(isFreeShippingMetafieldTrue('yes')).toBe(true)
    expect(isFreeShippingMetafieldTrue(true)).toBe(true)
  })

  it('does not widen on falsey / absent values', () => {
    expect(isFreeShippingMetafieldTrue({ value: 'false' })).toBe(false)
    expect(isFreeShippingMetafieldTrue('')).toBe(false)
    expect(isFreeShippingMetafieldTrue(null)).toBe(false)
    expect(isFreeShippingMetafieldTrue(undefined)).toBe(false)
    expect(isFreeShippingMetafieldTrue(false)).toBe(false)
  })
})

describe('gateFreeShippingClaim', () => {
  it('keeps a resolver-confirmed standard-free claim when the boolean is true', () => {
    expect(gateFreeShippingClaim(STANDARD_FREE, { value: 'true' })).toEqual(STANDARD_FREE)
    expect(gateFreeShippingClaim(STANDARD_FREE, 'true')).toEqual(STANDARD_FREE)
    expect(gateFreeShippingClaim(STANDARD_FREE, true)).toEqual(STANDARD_FREE)
  })

  it('downgrades standard-free to FALLBACK when the boolean is false/null/missing', () => {
    expect(gateFreeShippingClaim(STANDARD_FREE, { value: 'false' })).toEqual(FALLBACK)
    expect(gateFreeShippingClaim(STANDARD_FREE, null)).toEqual(FALLBACK)
    expect(gateFreeShippingClaim(STANDARD_FREE, undefined)).toEqual(FALLBACK)
    expect(gateFreeShippingClaim(STANDARD_FREE)).toEqual(FALLBACK)
  })

  // Requirement 4: the boolean must never OVERRIDE a non-standard-free
  // result — neither a true boolean creating a claim where the resolver
  // said something else, nor (trivially) a false one changing it further.
  it('never overrides threshold, paid, manual-quote, unknown, or the held/duplicate/failed fallback — regardless of the boolean', () => {
    for (const display of [THRESHOLD, STANDARD_PAID, MANUAL_QUOTE, UNKNOWN, FALLBACK]) {
      expect(gateFreeShippingClaim(display, { value: 'true' })).toEqual(display)
      expect(gateFreeShippingClaim(display, true)).toEqual(display)
      expect(gateFreeShippingClaim(display, { value: 'false' })).toEqual(display)
      expect(gateFreeShippingClaim(display, null)).toEqual(display)
      expect(gateFreeShippingClaim(display, undefined)).toEqual(display)
    }
  })

  it('a client-authored label value can never manufacture a claim', () => {
    expect(gateFreeShippingClaim(STANDARD_FREE, { value: 'Free Shipping' })).toEqual(FALLBACK)
    expect(gateFreeShippingClaim(THRESHOLD, { value: 'Free Shipping' })).toEqual(THRESHOLD)
  })
})

// DEV-SHIP-03 (Juliette's directive): the complete decision table. Rows are
// (resolver class) x (custom.free_shipping value); the only TRUE cell is
// standard-free x true. Every other cell — regardless of which side is
// true — must render no claim (FALLBACK). This is the literal truth table
// requirements 1-4 describe: two independent conditions, both required,
// neither can compensate for the other.
describe('gateFreeShippingClaim — complete truth table', () => {
  const RESOLVER_CLASSES: [string, ShippingDisplay][] = [
    ['standard-free (rate-confirmed)', STANDARD_FREE],
    ['threshold', THRESHOLD],
    ['standard-paid', STANDARD_PAID],
    ['manual-quote', MANUAL_QUOTE],
    ['unknown', UNKNOWN],
    ['FALLBACK (held / duplicate-variant / mixed-variant / failed-registry all collapse to this)', FALLBACK],
  ]
  const METAFIELD_VALUES: [string, { value: string } | string | boolean | null | undefined][] = [
    ['true', { value: 'true' }],
    ['false', { value: 'false' }],
    ['null', null],
    ['missing/undefined', undefined],
  ]

  for (const [className, display] of RESOLVER_CLASSES) {
    for (const [mfLabel, mfValue] of METAFIELD_VALUES) {
      const isStandardFree = display.class === 'standard-free'
      const shouldShow = isStandardFree && mfLabel === 'true'
      // Non-standard-free classes are never touched by the metafield in
      // either direction — they pass through as-is. Only a resolver-
      // confirmed standard-free result can be downgraded (to FALLBACK) by
      // a non-true boolean; nothing else ever collapses to FALLBACK here.
      const expected = !isStandardFree ? display : shouldShow ? display : FALLBACK
      const outcome = !isStandardFree ? 'passes through unchanged' : shouldShow ? 'SHOWS the claim' : 'suppresses (FALLBACK)'
      it(`resolver=${className}, custom.free_shipping=${mfLabel} -> ${outcome}`, () => {
        expect(gateFreeShippingClaim(display, mfValue)).toEqual(expected)
      })
    }
  }
})

describe('gateFreeShippingClaims (per-variant map)', () => {
  it('gates every entry with the same product-level boolean', () => {
    const displays = {
      'v-free': STANDARD_FREE,
      'v-threshold': THRESHOLD,
      'v-unknown': UNKNOWN,
    }
    expect(gateFreeShippingClaims(displays, { value: 'true' })).toEqual(displays)
    expect(gateFreeShippingClaims(displays, { value: 'false' })).toEqual({
      'v-free': FALLBACK,
      'v-threshold': THRESHOLD,
      'v-unknown': UNKNOWN,
    })
  })

  it('returns an empty map for an empty input', () => {
    expect(gateFreeShippingClaims({}, { value: 'true' })).toEqual({})
  })
})
