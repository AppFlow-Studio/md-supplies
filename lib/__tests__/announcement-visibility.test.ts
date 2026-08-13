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

  it('shows the bar at every width on the homepage', () => {
    expect(announcementBarClass('/')).toBe('flex')
  })

  it('hides it below md on inner routes while leaving desktop untouched', () => {
    const cls = announcementBarClass('/category/gloves')
    expect(cls).toContain('hidden')
    // Desktop behaviour is unchanged: the bar still lays out from md up.
    expect(cls).toContain('md:flex')
  })

  it('never emits a class that would leave an empty spacer', () => {
    // `hidden` is display:none — the element leaves layout flow entirely, so no
    // reserved height, no header-offset drift, no CLS.
    expect(announcementBarClass('/contact')).not.toMatch(/invisible|opacity-0/)
  })
})
