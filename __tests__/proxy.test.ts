import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL, status: number) =>
      new Response(null, { status, headers: { Location: url.toString() } }),
    rewrite: (url: URL) =>
      new Response(null, { status: 200, headers: { 'x-middleware-rewrite': url.toString() } }),
    next: (init?: { request?: { headers?: Headers } }) => {
      const res = new Response(null, { status: 200 }) as Response & {
        cookies: { set: (name: string, value: string, opts?: Record<string, unknown>) => void }
      }
      if (init?.request?.headers) {
        res.headers.set('x-nonce-forwarded', init.request.headers.get('x-nonce') ?? '')
      }
      // Minimal stand-in for NextResponse's cookie jar — real enough to assert
      // Set-Cookie was (or wasn't) written, without pulling in the actual
      // next/server implementation this suite deliberately mocks around.
      res.cookies = {
        set: (name, value, opts) => {
          const maxAge = opts?.maxAge ? `; Max-Age=${opts.maxAge}` : ''
          res.headers.append('Set-Cookie', `${name}=${value}${maxAge}`)
        },
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

function req(pathname: string, search = '', existingCookies: string[] = []): NextRequest {
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
    cookies: { has: (name: string) => existingCookies.includes(name) },
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

  // TEMP: blog not yet live in Shopify; pointing to category until articles are published
  it('row 6: /articles/types-of-sutures.html → /category/surgical-sutures (temp)', () => {
    const res = proxy(req('/articles/types-of-sutures.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/surgical-sutures')
  })

  it('row 13: /articles/types-of-needles.html → /category/needles-syringes (temp)', () => {
    const res = proxy(req('/articles/types-of-needles.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/needles-syringes')
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

describe('proxy — item-level 410 Gone entries', () => {
  it('row 2: Narcotics Storage → 410', () => {
    const res = proxy(req('/medical-supply-store/Pharmaceuticals/Medication Aids/Narcotics Storage-GRF8SCRI15.html'))
    expect(res?.status).toBe(410)
    expect(res?.headers.get('Location')).toBeNull()
  })

  it('row 21: Pharmaceutical Injectables → 410', () => {
    const res = proxy(req('/medical-supply-store/Pharmaceuticals/Injectables-U1GD8BVMR5.html'))
    expect(res?.status).toBe(410)
  })

  it('row 17: Thorne VeganPro Vanilla → 410', () => {
    const res = proxy(req('/medical-supplies-Thorne Research-VeganPro Complex Vanilla-WQEMF6Q8IH.html'))
    expect(res?.status).toBe(410)
  })

  it('row 18: Thorne VeganPro Chocolate → 410', () => {
    const res = proxy(req('/medical-supplies-Thorne Research-VeganPro Complex Chocolate-TIH9JNRQT6.html'))
    expect(res?.status).toBe(410)
  })

  it('+ normalization: Thorne Vanilla via + encoding → 410', () => {
    // Inbound URL has + signs; proxy normalizes to spaces before matching
    const res = proxy(req('/medical-supplies-Thorne+Research-VeganPro+Complex+Vanilla-WQEMF6Q8IH.html'))
    expect(res?.status).toBe(410)
  })

  it('trailing-slash normalization: item-level 410 still matches with a trailing slash', () => {
    const res = proxy(req('/medical-supply-store/Pharmaceuticals/Injectables-U1GD8BVMR5.html/'))
    expect(res?.status).toBe(410)
  })
})

describe('proxy — trailing-slash normalization (DEV-LAUNCH-12)', () => {
  it('static 301 entry still matches with a trailing slash', () => {
    const res = proxy(req('/Medical-Supply-Store.html/'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/categories')
  })

  it('bulk product redirect still matches with a trailing slash', () => {
    const withSlash = proxy(req(`${PRODUCT_ROWS[0].from}/`))
    const withoutSlash = proxy(req(PRODUCT_ROWS[0].from))
    expect(withSlash?.status).toBe(301)
    expect(withSlash?.headers.get('Location')).toBe(withoutSlash?.headers.get('Location'))
  })

  it('root "/" is never stripped down to an empty pathname', () => {
    const res = proxy(req('/'))
    expectPassThrough(res)
  })
})

// P0.7 AeroWalk color-neutral handle migration (Bilal, 2026-08-18): the QA
// pilot renamed the product from the Blue-suffixed handle to a color-neutral
// one. A live redirect from the old handle is the acceptance bar he set —
// without it, every existing bookmark/backlink to the Blue handle 404s.
describe('proxy — AeroWalk color-neutral handle migration (P0.7)', () => {
  it('old Blue handle → new color-neutral handle', () => {
    const res = proxy(req('/product/aerowalk-ultra-lite-rollator-rolling-walker-blue'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker',
    )
  })

  it('still matches with a trailing slash', () => {
    const res = proxy(req('/product/aerowalk-ultra-lite-rollator-rolling-walker-blue/'))
    expect(res?.status).toBe(301)
  })

  // Task 10 (2026-08-19): investigated whether the legacy old-store White/Grey
  // AeroWalk product pages (distinct from the Blue-handle QA pilot above) had
  // a redirect gap. They don't — docs/redirects-ready.json already carries
  // /products/aerowalk-ultra-lite-rollator-rolling-walker-white and -grey
  // rows, both mapping to /products/aerowalk-ultra-lite-rollator-rolling-walker,
  // which PRODUCT_REDIRECTS (the bulk map built from that file) rewrites to
  // the live singular route. That's the same neutral handle confirmed live
  // above and via scripts/verify-aerowalk-qa-pilot.ts (product 9365094531305).
  // These two assertions are regression coverage for an already-correct path,
  // not a fix.
  it('legacy White/Grey product pages already resolve via the bulk PRODUCT_REDIRECTS map (no gap)', () => {
    const white = proxy(req('/products/aerowalk-ultra-lite-rollator-rolling-walker-white'))
    const grey = proxy(req('/products/aerowalk-ultra-lite-rollator-rolling-walker-grey'))
    expect(white?.status).toBe(301)
    expect(white?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker',
    )
    expect(grey?.status).toBe(301)
    expect(grey?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker',
    )
  })

  // Bilal, 2026-08-20: extend the Blue-handle redirect to the nested
  // /category/<slug>/<handle> route too (app/category/[slug]/[product]/page.tsx
  // serves products there as well as at /product/<handle>) — via one reusable
  // rule covering all three legacy colors under both route shapes, not a
  // hand-copied entry per shape.
  it('redirects the legacy Blue handle under a nested /category/<slug>/ route too, not just /product/', () => {
    const res = proxy(req('/category/mobility/aerowalk-ultra-lite-rollator-rolling-walker-blue'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe(
      'https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker',
    )
  })

  it('redirects the legacy White and Grey handles under both /product/ and /category/<slug>/', () => {
    for (const color of ['white', 'grey']) {
      const underProduct = proxy(req(`/product/aerowalk-ultra-lite-rollator-rolling-walker-${color}`))
      const underCategory = proxy(req(`/category/mobility/aerowalk-ultra-lite-rollator-rolling-walker-${color}`))
      for (const res of [underProduct, underCategory]) {
        expect(res?.status).toBe(301)
        expect(res?.headers.get('Location')).toBe(
          'https://mdsupplies.com/product/aerowalk-ultra-lite-rollator-rolling-walker',
        )
      }
    }
  })

  it('does not redirect an unrelated /category/<slug>/<handle> pair (no false-positive match)', () => {
    const res = proxy(req('/category/mobility/some-real-product-handle'))
    expectPassThrough(res as Response)
  })
})

describe('proxy — new 301 entries (backlink recovery)', () => {
  it('face-coverings root → /category/face-masks (no chain)', () => {
    const res = proxy(req('/category/face-coverings'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/face-masks')
  })

  it('face-coverings subtree → /category/face-masks/<product> (single hop, no chain)', () => {
    const res = proxy(req('/category/face-coverings/kn95-mask-50-pack'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/face-masks/kn95-mask-50-pack')
  })

  it('row 3: Dynarex Specimen Containers → /partners/dynarex', () => {
    const res = proxy(req('/medical-supplies-Dynarex-Specimen-Containers-4oz-22I48F9UI7.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/dynarex')
  })

  it('row 5: Exel Insulin Syringe → /category/needles-syringes', () => {
    const res = proxy(req('/medical-supplies-Exel-Insulin-Syringe-05cc-29g-x-12-8DKB9DMTEX.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/needles-syringes')
  })

  it('row 9: 10cc Syringes (++ double-space normalization) → /category/needles-syringes', () => {
    // "Needles++Syringes" in the raw URL normalizes to "Needles  Syringes" (double space)
    const res = proxy(req('/medical-supply-store/Needles++Syringes/Syringes/10cc+Syringes+w+Needle-DMGAATSB9S.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/needles-syringes')
  })

  it('row 11: NDD EASYONE SPIRETTES → /category/respiratory', () => {
    const res = proxy(req('/medical-supplies-ndd+Medical+Technologies+Inc.-EASYONE+SPIRETTES-I78AVCLDSL.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/respiratory')
  })

  it('row 12: Leg Immobilizers → /category/emergency-supplies', () => {
    const res = proxy(req('/medical-supply-store/Emergency+Supplies/Immobilizers/Leg+Immobilizers-IQ9MV1MBEB.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/emergency-supplies')
  })

  it('row 14: Emergency Trauma Dressings (++ double-space) → /category/wound-care', () => {
    const res = proxy(req('/medical-supply-store/Wound++Skin+Care/Wound+Care+Dressings/Emergency++Trauma+Dressings-1MRS82K82J.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/wound-care')
  })

  it('row 16: Feather Sterile Surgical Blades → /category/wound-care', () => {
    const res = proxy(req('/medical-supplies-Feather-Sterile+Surgical+Blades+11-2ULXL3BIJK.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/wound-care')
  })

  // Task 10 (2026-08-19): the ACTION comment at proxy.ts flagged
  // /product/drape-sheets-40-x-60-2-ply-blue-100-cs as needing a pre-deploy
  // 200 check. Live Storefront API query confirms that handle does not
  // exist (no "Drape Sheet" or "Graham Medical"-vendor product remains in
  // the catalog at all — the whole line was discontinued, not just
  // recolored). Redirects to /category/exam-room instead, matching the
  // established no-live-handle fallback pattern used elsewhere in this file
  // (Feather Surgical Blades / Emergency Trauma Dressings / Triangular
  // Bandages → /category/wound-care). /category/exam-room verified live via
  // GET_COLLECTION_META against the QA store.
  it('row 19: Graham Drape Sheet White → /category/exam-room (dead product handle replaced)', () => {
    const res = proxy(req('/medical-supplies-Graham+Medical-Drape+Sheet+White+40+x+60+2-Ply-XVUAKHW2KF.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/exam-room')
  })

  it('row 20: Triangular Bandages (++ double-space) → /category/wound-care', () => {
    const res = proxy(req('/medical-supply-store/Wound++Skin+Care/Elastic+Bandages/Triangular+Bandages-ATPW8HKJSB.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/wound-care')
  })

  it('row 24: Lipid/Glucose Testing → /category/testing-screening', () => {
    const res = proxy(req('/medical-supply-store/Testing-and-Screening/Diagnostic-Tests/Lipid-Glucose-Testing-Z2IP7J6EF7.html'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/category/testing-screening')
  })

  it('redirects the legacy Shopify collection URL to the canonical category route, preserving query params', () => {
    const res = proxy(req('/collections/trocars-trocar-kits', '?variant=51633171923177'))
    expect(res?.status).toBe(301)
    const location = new URL(res!.headers.get('Location')!)
    expect(location.pathname).toBe('/category/trocars-trocar-kits')
    expect(location.searchParams.get('variant')).toBe('51633171923177')
  })

  it('redirects a nested path beneath the legacy collection URL in a single hop', () => {
    const res = proxy(req('/collections/trocars-trocar-kits/some-product'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/trocars-trocar-kits/some-product')
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
      '/category/surgical-sutures', '/category/needles-syringes',
      '/category/respiratory', '/category/emergency-supplies', '/category/wound-care',
      '/category/testing-screening', '/product/drape-sheets-40-x-60-2-ply-blue-100-cs',
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

  // Task 11 (2026-08-19): full redirect audit (scripts/audit-redirects.ts) confirmed
  // the same dead-destination pattern Task 10 found and fixed for the hand-written
  // Graham Drape Sheet White 40x60 entry above also exists for its three sibling
  // rows in the BULK table (docs/redirects-ready.json), which Task 10 flagged but
  // explicitly deferred to this task. Live Storefront API checks (direct handle
  // lookup + title/vendor search for "drape sheet" / "Graham Medical") confirm
  // none of the three Blue target handles exist, and the whole Drape Sheet line /
  // Graham Medical vendor is absent from the catalog — same corroboration Task 10
  // used, not just a single-handle 404. Falls back to /category/exam-room, the
  // same no-live-handle pattern.
  it('Task 11: Drape Sheet White 40x90/40x60/40x48 bulk rows → /category/exam-room (dead Blue target handles)', () => {
    const rows = [
      '/products/drape-sheets-40-x-90-2-ply-white-50-cs',
      '/products/drape-sheets-40-x-60-2-ply-white-100-cs',
      '/products/drape-sheets-40-x-48-2-ply-white-100-cs',
    ]
    for (const from of rows) {
      const res = proxy(req(from))
      expect(res?.status).toBe(301)
      expect(res?.headers.get('Location')).toBe('https://mdsupplies.com/category/exam-room')
    }
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

describe('proxy — category query variants are NOT rewritten (twin route removed)', () => {
  // Phase 5: /category/[slug] reads searchParams directly and is the only
  // category route. The old rewrite to /category-browse put the clean and
  // filtered views on different route segments, so every filter/sort/search
  // interaction crossed a route boundary and remounted the page.
  it('passes through ?page, ?sort, ?filter and ?q without rewriting', () => {
    expectPassThrough(proxy(req('/category/gloves', '?page=2')))
    expectPassThrough(proxy(req('/category/gloves', '?sort=PRICE_ASC')))
    expectPassThrough(proxy(req('/category/gloves', '?filter=size:large')))
    expectPassThrough(proxy(req('/category/gloves', '?q=nitrile')))
  })

  it('never emits a /category-browse rewrite header', () => {
    for (const q of ['?page=2', '?sort=PRICE_ASC', '?filter=size:large', '?q=nitrile', '']) {
      const res = proxy(req('/category/gloves', q))
      expect(res?.headers.get('x-middleware-rewrite') ?? '').not.toContain('category-browse')
    }
  })

  it('passes through the canonical category page (no query)', () => {
    expectPassThrough(proxy(req('/category/gloves')))
  })

  it('passes through tracking-only queries (utm/gclid do not change results)', () => {
    expectPassThrough(proxy(req('/category/gloves', '?utm_source=chatgpt.com&gclid=x')))
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

describe('proxy — first-touch gclid/utm attribution capture (DEV-LAUNCH-12)', () => {
  it('captures gclid + utm_* into a durable cookie on a pass-through request', () => {
    const res = proxy(req('/category/gloves', '?gclid=abc123&utm_source=google&utm_medium=cpc'))
    const setCookie = res.headers.get('Set-Cookie')
    expect(setCookie).toContain('md_attr=')
    const value = decodeURIComponent(setCookie!.split('md_attr=')[1].split(';')[0])
    expect(JSON.parse(value)).toEqual({ gclid: 'abc123', utm_source: 'google', utm_medium: 'cpc' })
  })

  it('does not write a cookie when the request carries no tracking params', () => {
    const res = proxy(req('/category/gloves'))
    expect(res.headers.get('Set-Cookie')).toBeNull()
  })

  it('does not overwrite an existing capture (first-touch, not last-touch)', () => {
    const res = proxy(req('/category/gloves', '?gclid=second-click', ['md_attr']))
    expect(res.headers.get('Set-Cookie')).toBeNull()
  })
})
