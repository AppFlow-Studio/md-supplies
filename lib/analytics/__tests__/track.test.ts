import { describe, it, expect, vi, beforeEach } from 'vitest'

const pushed: Record<string, unknown>[] = []
vi.mock('@next/third-parties/google', () => ({
  sendGTMEvent: (data: Record<string, unknown>) => { pushed.push(data) },
}))

const { track } = await import('@/lib/analytics/track')
const { buildAddToCartEvent, buildPageViewEvent, buildSearchEvent } = await import(
  '@/lib/analytics/events'
)

beforeEach(() => { pushed.length = 0 })

describe('track', () => {
  it('clears the ecommerce object before every ecommerce push', () => {
    // GTM merges pushes into its model and merges arrays BY INDEX, so without
    // this reset a 24-item view_item_list leaves items[1..23] behind and the
    // next single-item event reports all 24. Google's ecommerce guide requires
    // the clear; doing it in track() means no call site can forget.
    track(buildAddToCartEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'x', price: 1 } }))
    expect(pushed).toHaveLength(2)
    expect(pushed[0]).toEqual({ ecommerce: null })
    expect(pushed[1]).toMatchObject({ event: 'add_to_cart' })
  })

  it('does not push a null for events that carry no ecommerce object', () => {
    track(buildPageViewEvent({ path: '/p', location: 'https://x/p', title: 't' }))
    track(buildSearchEvent({ term: 'gloves', results: 3 }))
    expect(pushed).toHaveLength(2)
    expect(pushed.some((p) => 'ecommerce' in p)).toBe(false)
  })
})
