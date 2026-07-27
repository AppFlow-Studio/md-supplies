import { describe, it, expect } from 'vitest'
import {
  resolveShippingDisplay,
  hasLegacyFreeSignal,
  formatAmount,
  SHIPPING_FALLBACK_MESSAGE,
} from '@/lib/shipping-display'

describe('resolveShippingDisplay, explicit class', () => {
  it('free class → "Free shipping" + badge', () => {
    const d = resolveShippingDisplay({ displayClass: 'free' })
    expect(d).toEqual({ displayClass: 'free', message: 'Free shipping', badge: 'Free Shipping' })
  })

  it('accepts the catalog-model alias standard-free', () => {
    expect(resolveShippingDisplay({ displayClass: 'standard-free' }).displayClass).toBe('free')
  })

  it('accepts the catalog-model alias standard-paid', () => {
    expect(resolveShippingDisplay({ displayClass: 'standard-paid', flatRate: '20' }).displayClass).toBe('paid')
  })

  it('normalizes case and whitespace in the class value', () => {
    expect(resolveShippingDisplay({ displayClass: '  FREE ' }).displayClass).toBe('free')
  })

  it('threshold class with a valid threshold names the amount', () => {
    const d = resolveShippingDisplay({ displayClass: 'threshold', threshold: '30' })
    expect(d.displayClass).toBe('threshold')
    expect(d.message).toBe('Free shipping on orders over $30')
    expect(d.badge).toBe('Free over $30')
  })

  it('threshold class formats non-integer amounts with cents', () => {
    const d = resolveShippingDisplay({ displayClass: 'threshold', threshold: '49.5' })
    expect(d.message).toBe('Free shipping on orders over $49.50')
  })

  it('paid class with a valid flat rate names the rate', () => {
    const d = resolveShippingDisplay({ displayClass: 'paid', flatRate: '10.95' })
    expect(d).toEqual({
      displayClass: 'paid',
      message: 'Flat-rate shipping from $10.95',
      badge: null,
    })
  })

  it('explicit paid class outranks a conflicting free-shipping tag', () => {
    const d = resolveShippingDisplay({
      displayClass: 'paid',
      flatRate: '15',
      tags: ['free-shipping'],
      freeShipping: 'true',
    })
    expect(d.displayClass).toBe('paid')
    expect(d.message).toBe('Flat-rate shipping from $15')
    expect(d.badge).toBeNull()
  })
})

describe('resolveShippingDisplay, missing/invalid data (fallback discipline)', () => {
  it('no signals at all → unknown + exact fallback copy', () => {
    const d = resolveShippingDisplay({})
    expect(d).toEqual({ displayClass: 'unknown', message: SHIPPING_FALLBACK_MESSAGE, badge: null })
  })

  it('the fallback copy is the exact required string', () => {
    expect(SHIPPING_FALLBACK_MESSAGE).toBe('Shipping calculated at checkout.')
  })

  it('junk class value → unknown fallback (not a crash, not a guess)', () => {
    for (const junk of ['expedited', 'FREE!!', '123', 'null', 'undefined', ' ']) {
      const d = resolveShippingDisplay({ displayClass: junk })
      expect(d.displayClass).toBe('unknown')
      expect(d.message).toBe(SHIPPING_FALLBACK_MESSAGE)
    }
  })

  it('threshold class with missing threshold → unknown (never invents an amount)', () => {
    const d = resolveShippingDisplay({ displayClass: 'threshold' })
    expect(d.displayClass).toBe('unknown')
    expect(d.message).toBe(SHIPPING_FALLBACK_MESSAGE)
  })

  it('threshold class with invalid threshold values → unknown', () => {
    for (const bad of ['', ' ', '$30', 'free', '-5', '0', 'NaN', 'Infinity', '1,000', '30 USD']) {
      const d = resolveShippingDisplay({ displayClass: 'threshold', threshold: bad })
      expect(d.displayClass).toBe('unknown')
      expect(d.message).toBe(SHIPPING_FALLBACK_MESSAGE)
    }
  })

  it('paid class with missing/invalid flat rate keeps the class but falls back on copy', () => {
    for (const bad of [undefined, null, '', '$10.95', 'call us', '-1', '0']) {
      const d = resolveShippingDisplay({ displayClass: 'paid', flatRate: bad as string | null | undefined })
      expect(d.displayClass).toBe('paid')
      expect(d.message).toBe(SHIPPING_FALLBACK_MESSAGE)
      expect(d.badge).toBeNull()
    }
  })

  it('null/undefined signal fields are tolerated', () => {
    const d = resolveShippingDisplay({
      tags: null,
      displayClass: null,
      freeShipping: undefined,
      threshold: null,
      flatRate: undefined,
    })
    expect(d.displayClass).toBe('unknown')
  })
})

describe('resolveShippingDisplay, legacy free signals', () => {
  it('free-shipping tag alone → free', () => {
    const d = resolveShippingDisplay({ tags: ['gloves', 'free-shipping'] })
    expect(d.displayClass).toBe('free')
    expect(d.message).toBe('Free shipping')
    expect(d.badge).toBe('Free Shipping')
  })

  it('custom.free_shipping = "true" alone → free', () => {
    expect(resolveShippingDisplay({ freeShipping: 'true' }).displayClass).toBe('free')
    expect(resolveShippingDisplay({ freeShipping: ' TRUE ' }).displayClass).toBe('free')
  })

  it('custom.free_shipping = "false" is NOT a free signal', () => {
    expect(resolveShippingDisplay({ freeShipping: 'false' }).displayClass).toBe('unknown')
  })

  it('unrelated tags are not a signal', () => {
    expect(resolveShippingDisplay({ tags: ['free', 'shipping', 'freeshipping'] }).displayClass).toBe('unknown')
  })

  it('legacy signal only applies when the explicit class is absent or invalid', () => {
    // invalid class + tag → the tag still wins over nothing
    const d = resolveShippingDisplay({ displayClass: 'bogus', tags: ['free-shipping'] })
    expect(d.displayClass).toBe('free')
  })
})

describe('hasLegacyFreeSignal', () => {
  it('detects the tag', () => {
    expect(hasLegacyFreeSignal(['free-shipping'], null)).toBe(true)
  })
  it('detects the metafield', () => {
    expect(hasLegacyFreeSignal([], 'true')).toBe(true)
  })
  it('is false for empty inputs', () => {
    expect(hasLegacyFreeSignal(null, null)).toBe(false)
    expect(hasLegacyFreeSignal([], 'false')).toBe(false)
  })
})

describe('formatAmount', () => {
  it('drops cents for integers', () => {
    expect(formatAmount(30)).toBe('$30')
    expect(formatAmount(700)).toBe('$700')
  })
  it('keeps two decimals otherwise', () => {
    expect(formatAmount(10.95)).toBe('$10.95')
    expect(formatAmount(20.9)).toBe('$20.90')
  })
})
