import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL, status: number) =>
      new Response(null, { status, headers: { Location: url.toString() } }),
  },
}))

import type { NextRequest } from 'next/server'
import { proxy } from '../proxy'

function req(pathname: string, search = ''): NextRequest {
  const base = 'https://mdsupplies.com'
  return {
    nextUrl: { pathname, search },
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
})

describe('proxy — path normalization (pass-through for unknown)', () => {
  it('passes through unknown paths', () => {
    const res = proxy(req('/some-random-page'))
    expect(res).toBeUndefined()
  })

  it('passes through canonical targets (no chains)', () => {
    const targets = [
      '/categories', '/category/gloves', '/category/face-masks', '/category/hygiene',
      '/partners/drive-medical', '/partners/dynarex', '/industries/private-practice',
      '/blog/types-of-sutures', '/blog/types-of-needles',
    ]
    for (const target of targets) {
      expect(proxy(req(target))).toBeUndefined()
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
    expect(
      proxy(req('/product/8-mil-nitrile-industrial-gloves-diamond-textured-black-small-9101')),
    ).toBeUndefined()
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
    const res = proxy(req('/brandsomething'))
    expect(res).toBeUndefined()
  })
})
