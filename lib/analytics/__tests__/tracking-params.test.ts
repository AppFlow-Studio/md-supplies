import { describe, it, expect } from 'vitest'
import { isTrackingParam, extractTrackingParams, withTrackingParams } from '../tracking-params'

describe('isTrackingParam', () => {
  it('matches any utm_ prefixed param', () => {
    expect(isTrackingParam('utm_source')).toBe(true)
    expect(isTrackingParam('utm_medium')).toBe(true)
    expect(isTrackingParam('utm_campaign')).toBe(true)
    expect(isTrackingParam('utm_anything')).toBe(true)
  })

  it('matches known ad click-id params', () => {
    expect(isTrackingParam('msclkid')).toBe(true) // Microsoft / Bing Ads
    expect(isTrackingParam('gclid')).toBe(true) // Google Ads
    expect(isTrackingParam('fbclid')).toBe(true) // Meta
  })

  it('is case-insensitive', () => {
    expect(isTrackingParam('UTM_Source')).toBe(true)
    expect(isTrackingParam('MSCLKID')).toBe(true)
  })

  it('does not match app navigation params', () => {
    expect(isTrackingParam('sort')).toBe(false)
    expect(isTrackingParam('filter')).toBe(false)
    expect(isTrackingParam('page')).toBe(false)
    expect(isTrackingParam('after')).toBe(false)
    expect(isTrackingParam('q')).toBe(false)
  })
})

describe('extractTrackingParams', () => {
  it('returns only tracking entries from URLSearchParams', () => {
    const src = new URLSearchParams('sort=price&utm_source=chatgpt.com&filter=a&msclkid=xyz&page=2')
    expect(extractTrackingParams(src)).toEqual([
      ['utm_source', 'chatgpt.com'],
      ['msclkid', 'xyz'],
    ])
  })

  it('handles a plain record with string and string[] values', () => {
    const src = { sort: 'price', utm_source: 'bing', filter: ['a', 'b'], utm_medium: 'cpc' }
    expect(extractTrackingParams(src)).toEqual([
      ['utm_source', 'bing'],
      ['utm_medium', 'cpc'],
    ])
  })

  it('returns an empty array when there are no tracking params', () => {
    expect(extractTrackingParams(new URLSearchParams('sort=price&page=2'))).toEqual([])
  })
})

describe('withTrackingParams', () => {
  it('merges tracking params from the source into the target', () => {
    const target = new URLSearchParams('sort=price')
    const src = new URLSearchParams('utm_source=chatgpt.com&utm_medium=referral&msclkid=abc')
    withTrackingParams(target, src)
    expect(target.toString()).toBe('sort=price&utm_source=chatgpt.com&utm_medium=referral&msclkid=abc')
  })

  it('does not overwrite a key already present on the target', () => {
    const target = new URLSearchParams('utm_source=existing')
    const src = new URLSearchParams('utm_source=new')
    withTrackingParams(target, src)
    expect(target.getAll('utm_source')).toEqual(['existing'])
  })

  it('ignores non-tracking params in the source', () => {
    const target = new URLSearchParams('sort=price')
    const src = new URLSearchParams('page=3&after=cursor')
    withTrackingParams(target, src)
    expect(target.toString()).toBe('sort=price')
  })

  it('returns the target for chaining', () => {
    const target = new URLSearchParams()
    expect(withTrackingParams(target, new URLSearchParams('utm_source=x'))).toBe(target)
  })
})
