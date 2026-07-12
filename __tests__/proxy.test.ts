import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL, status: number) =>
      new Response(null, { status, headers: { Location: url.toString() } }),
    rewrite: (url: URL) =>
      new Response(null, { status: 200, headers: { 'x-middleware-rewrite': url.toString() } }),
    next: (init?: { request?: { headers?: Headers } }) => {
      const res = new Response(null, { status: 200 })
      if (init?.request?.headers) {
        res.headers.set('x-nonce-forwarded', init.request.headers.get('x-nonce') ?? '')
      }
      return res
    },
  },
}))

import type { NextRequest } from 'next/server'
import { proxy } from '../proxy'
import productRedirects from '../docs/redirects-ready.json'

const PRODUCT_ROWS = productRedirects as { from: string; to: string }[]

// proxy() now always returns a Response (it stamps CSP headers on every
// path, including pass-through) instead of `undefined` — this asserts the
// "no redirect/rewrite happened" case that `toBeUndefined()` used to check.
function expectPassThrough(res: Response): void {
  expect(res.status).toBe(200)
  expect(res.headers.get('Location')).toBeNull()
  expect(res.headers.get('x-middleware-rewrite')).toBeNull()
}

function req(pathname: string, search = ''): NextRequest {
  const base = 'https://mdsupplies.com'
  const url = new URL(`${base}${pathname}${search}`)
  return {
    nextUrl: {
      pathname,
      search,
      searchParams: url.searchParams,
      clone: () => new URL(url.toString()),
    },
    url: `${base}${pathname}${search}`,
  } as unknown as NextRequest
}

describe('proxy — 301 static redirects', () => {
  it('row 1: /Medical-Supply-Store.html → /categories', () => {
    const res = proxy(req('/Medical-Supply-Store.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/categories')
  })

  it('row 25: /all-categories.html → /categories', () => {
    const res = proxy(req('/all-categories.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/categories')
  })

  it('row 26: /medical-supply-store/Gloves-G78R26U43E.html → /category/gloves', () => {
    const res = proxy(req('/medical-supply-store/Gloves-G78R26U43E.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/gloves')
  })

  it('row 15: /face-masks-n95-kn95.html → /category/face-masks', () => {
    const res = proxy(req('/face-masks-n95-kn95.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/face-masks')
  })

  it('row 22: /medical-supply-store/Face-Masks-CYR82C7EBL.html (with query) → /category/face-masks', () => {
    const res = proxy(req('/medical-supply-store/Face-Masks-CYR82C7EBL.html', '?formularyId=123'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/face-masks')
  })

  it('row 23: /medical-supply-store/Hygiene-WQ2ENW7KU6.html → /category/hygiene', () => {
    const res = proxy(req('/medical-supply-store/Hygiene-WQ2ENW7KU6.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/hygiene')
  })

  it('row 4: /supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html → /partners/drive-medical', () => {
    const res = proxy(req('/supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/drive-medical')
  })

  it('row 7: /Durable-Equipment-Medical.html → /partners/drive-medical', () => {
    const res = proxy(req('/Durable-Equipment-Medical.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/drive-medical')
  })

  it('row 8: /supplies-by-vendor/Dynarex-MM7QQM8CLP.html → /partners/dynarex', () => {
    const res = proxy(req('/supplies-by-vendor/Dynarex-MM7QQM8CLP.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/dynarex')
  })

  it('row 10: /Medical-Supplies-for-Doctors.html → /industries/private-practice', () => {
    const res = proxy(req('/Medical-Supplies-for-Doctors.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/industries/private-practice')
  })

  it('row 6: /articles/types-of-sutures.html → /blog/types-of-sutures', () => {
    const res = proxy(req('/articles/types-of-sutures.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/blog/types-of-sutures')
  })

  it('row 13: /articles/types-of-needles.html → /blog/types-of-needles', () => {
    const res = proxy(req('/articles/types-of-needles.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/blog/types-of-needles')
  })

  it('DEV-11: /b2b → /contact (single 301, account-scope cleanup)', () => {
    const res = proxy(req('/b2b'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/contact')
  })
})

describe('proxy — category-level 410s (§4.3)', () => {
  const goneSlugs = ['pharmaceuticals', 'beds', 'bariatric-beds', 'bed-parts', 'spa', 'pet']

  for (const slug of goneSlugs) {
    it(`/category/${slug} → 410 Gone`, () => {
      const res = proxy(req(`/category/${slug}`))
      expect(res?.status).toBe(410)
      expect(res?.headers.get('Location')).toBeNull()
    })

    it(`/category/${slug}/<subpath> → 410 (whole subtree is gone)`, () => {
      const res = proxy(req(`/category/${slug}/anything-below`))
      expect(res?.status).toBe(410)
    })
  }

  it('does not 410 a live category whose slug merely starts with a gone slug', () => {
    // `bedside-care` must not be swallowed by the gone slug `beds`.
    expectPassThrough(proxy(req('/category/bedside-care')))
    expectPassThrough(proxy(req('/category/bed-pans')))
  })

  it('does not 410 a live category', () => {
    expectPassThrough(proxy(req('/category/gloves')))
    expectPassThrough(proxy(req('/category/wound-care')))
  })
})

describe('proxy — path normalization (pass-through for unknown)', () => {
  it('passes through unknown paths', () => {
    expectPassThrough(proxy(req('/some-random-page')))
  })

  it('passes through canonical targets (no chains)', () => {
    const targets = [
      '/categories', '/category/gloves', '/category/face-masks', '/category/hygiene',
      '/partners/drive-medical', '/partners/dynarex', '/industries/private-practice',
      '/blog/types-of-sutures', '/blog/types-of-needles',
    ]
    for (const target of targets) {
      expectPassThrough(proxy(req(target)))
    }
  })
})

describe('proxy — bulk product catalog 301s', () => {
  it('maps a consolidated legacy variant URL to its singular canonical target', () => {
    // Row from docs/redirects-ready.json — green XL variant consolidated into the
    // black small canonical. The plural `to` in the data is rewritten to singular.
    const res = proxy(req('/products/8-mil-nitrile-industrial-gloves-diamond-textured-green-xl-8104'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/8-mil-nitrile-industrial-gloves-diamond-textured-black-small-9101',
    )
  })

  it('blanket fallback: an un-enumerated /products/<handle> → /product/<handle>', () => {
    const res = proxy(req('/products/some-surviving-handle-not-in-the-map'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/some-surviving-handle-not-in-the-map',
    )
  })

  it('the singular canonical target passes through (no chain / no double redirect)', () => {
    expectPassThrough(
      proxy(req('/product/8-mil-nitrile-industrial-gloves-diamond-textured-black-small-9101')),
    )
  })
})

describe('proxy — full product redirect map (programmatic sweep)', () => {
  const froms = PRODUCT_ROWS.map((r) => r.from)
  const fromSet = new Set(froms)
  const singular = (to: string) => to.replace(/^\/products\//, '/product/')

  it('every `from` is unique (no duplicate source keys)', () => {
    expect(fromSet.size).toBe(froms.length)
  })

  it('no self-redirects (from never equals its singular target)', () => {
    const selfRedirects = PRODUCT_ROWS.filter((r) => r.from === singular(r.to))
    expect(selfRedirects).toEqual([])
  })

  it('no chains: no target is itself a redirect source (single hop always lands live)', () => {
    // A chain would exist if a `to` (or its singular form) is also a `from`.
    const chained = PRODUCT_ROWS.filter(
      (r) => fromSet.has(r.to) || fromSet.has(singular(r.to)),
    )
    expect(chained).toEqual([])
  })

  it('every row drives a single 301 to its singular canonical target', () => {
    const failures: string[] = []
    for (const { from, to } of PRODUCT_ROWS) {
      const res = proxy(req(from))
      const loc = res?.headers.get('Location')
      // Location is a full, percent-encoded URL; decode the pathname before
      // comparing against the raw (unicode) target in the data file.
      const locPath = loc ? decodeURIComponent(new URL(loc).pathname) : null
      if (res?.status !== 301 || locPath !== singular(to)) {
        failures.push(`${from} → got ${res?.status} ${locPath ?? '(none)'}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('every singular canonical target passes through (no double redirect)', () => {
    const chained: string[] = []
    for (const { to } of PRODUCT_ROWS) {
      const res = proxy(req(singular(to)))
      if (res.headers.get('Location') || res.headers.get('x-middleware-rewrite')) {
        chained.push(singular(to))
      }
    }
    expect(chained).toEqual([])
  })
})

describe('proxy — brands wildcard', () => {
  it('/brands → /partners', () => {
    const res = proxy(req('/brands'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/partners')
  })

  it('/brands/drive-medical → /partners/drive-medical', () => {
    const res = proxy(req('/brands/drive-medical'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/partners/drive-medical')
  })

  it('/brands/dynarex/products → /partners/dynarex/products', () => {
    const res = proxy(req('/brands/dynarex/products'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/partners/dynarex/products')
  })

  it('/brandsomething passes through (not a brands prefix)', () => {
    expectPassThrough(proxy(req('/brandsomething')))
  })
})

describe('proxy — category query variants rewrite to /category-browse (H1)', () => {
  it('rewrites /category/gloves?page=2, preserving the query', () => {
    const res = proxy(req('/category/gloves', '?page=2'))
    expect(res?.headers.get('x-middleware-rewrite')).toBe(
      'https://mdsupplies.com/category-browse/gloves?page=2',
    )
  })

  it('rewrites sort and filter variants', () => {
    expect(proxy(req('/category/gloves', '?sort=PRICE_ASC'))?.headers.get('x-middleware-rewrite'))
      .toContain('/category-browse/gloves')
    expect(proxy(req('/category/gloves', '?filter=size:large'))?.headers.get('x-middleware-rewrite'))
      .toContain('/category-browse/gloves')
  })

  it('does not rewrite the canonical category page (no query)', () => {
    expectPassThrough(proxy(req('/category/gloves')))
  })

  it('does not rewrite tracking-only queries (utm/gclid do not change results)', () => {
    expectPassThrough(proxy(req('/category/gloves', '?utm_source=chatgpt.com&gclid=x')))
  })

  it('does not rewrite subcategory/product paths under /category', () => {
    expectPassThrough(proxy(req('/category/gloves/nitrile-exam-gloves', '?page=2')))
  })
})

describe('proxy — CSP + nonce (M10)', () => {
  it('sets an enforcing CSP with a nonce on every response', () => {
    const res = proxy(req('/'))
    const csp = res.headers.get('Content-Security-Policy')
    expect(csp).toMatch(/'nonce-[^']+'/)
    const scriptSrc = csp!.split('; ').find((d) => d.startsWith('script-src'))!
    expect(scriptSrc).not.toContain('unsafe-inline')
  })

  it('sets a parallel Report-Only header', () => {
    const res = proxy(req('/'))
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toBeTruthy()
  })

  it('forwards the same nonce as a request header for Server Components to read', () => {
    const res = proxy(req('/'))
    const csp = res.headers.get('Content-Security-Policy')!
    const nonce = csp.match(/'nonce-([^']+)'/)![1]
    expect(res.headers.get('x-nonce-forwarded')).toBe(nonce)
  })

  it('every request gets a different nonce', () => {
    const n1 = proxy(req('/')).headers.get('Content-Security-Policy')
    const n2 = proxy(req('/')).headers.get('Content-Security-Policy')
    expect(n1).not.toBe(n2)
  })

  it('redirects still carry the CSP headers', () => {
    const res = proxy(req('/brands'))
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('410s still carry the CSP headers', () => {
    const res = proxy(req('/category/beds'))
    expect(res.status).toBe(410)
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('rewrites still carry the CSP headers', () => {
    const res = proxy(req('/category/gloves', '?page=2'))
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
  })
})
