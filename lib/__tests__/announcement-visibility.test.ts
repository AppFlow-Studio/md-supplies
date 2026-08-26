import { describe, it, expect } from 'vitest'
import { isHomeRoute, announcementBarClass } from '@/lib/announcement-visibility'

describe('announcement carousel route gating', () => {
  it('treats only the site root as home', () => {
    expect(isHomeRoute('/')).toBe(true)
  })

  it('treats every inner route as not-home, including nested ones', () => {
    for (const path of [
      '/categories',
      '/category/gloves',
      '/category/gloves/nitrile-gloves',
      '/industries',
      '/industries/urgent-care',
      '/contact',
      '/solutions/occ',
      '/search',
      '/cart',
      '/account/orders/1001',
      '/product/some-handle',
    ]) {
      expect(isHomeRoute(path), path).toBe(false)
    }
  })

  it('is not fooled by a trailing slash in either direction', () => {
    expect(isHomeRoute('/')).toBe(true)
    expect(isHomeRoute('/contact/')).toBe(false)
    expect(isHomeRoute('/category/gloves/')).toBe(false)
  })

  it('ignores query strings and hashes if a raw URL is passed', () => {
    expect(isHomeRoute('/?utm_source=google')).toBe(true)
    expect(isHomeRoute('/contact?subject=orders')).toBe(false)
    expect(isHomeRoute('/#main')).toBe(true)
  })

  it('fails closed on a missing pathname', () => {
    expect(isHomeRoute(null)).toBe(false)
    expect(isHomeRoute(undefined)).toBe(false)
    expect(isHomeRoute('')).toBe(false)
  })

  it('hides the bar below md on EVERY route, homepage included', () => {
    // The homepage used to be the one route that kept the bar at phone widths.
    // It no longer is: phones get the vertical space back everywhere.
    const cls = announcementBarClass()
    expect(cls).toContain('hidden')
    expect(cls).not.toBe('flex')
  })

  it('leaves desktop behaviour untouched', () => {
    // The bar still lays out from md (768px) up, on every route.
    expect(announcementBarClass()).toContain('md:flex')
  })

  it('never emits a class that would leave an empty spacer', () => {
    // `hidden` is display:none — the element leaves layout flow entirely, so no
    // reserved height, no header-offset drift, no CLS.
    expect(announcementBarClass()).not.toMatch(/invisible|opacity-0/)
  })
})
