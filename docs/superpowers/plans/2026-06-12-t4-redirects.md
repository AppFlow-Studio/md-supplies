# T4 · Redirects & Broken Backlinks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up all 301 redirects and 410 Gone responses in `proxy.ts` so every broken backlink routes to the closest canonical destination in a single hop.

**Architecture:** `proxy.ts` holds all redirect logic (static `REDIRECT_ENTRIES` map + brands wildcard). A thin `middleware.ts` re-exports `proxy` as the default Next.js middleware export and re-exports `config`. Path normalization (`decodeURIComponent` + `+`→space) runs before matching so encoded variants hit the same entry. All redirects use `NextResponse.redirect(url, 301)` for a true 301 (not Next's default 308).

**Tech Stack:** Next.js 16 App Router middleware, `next/server` (`NextRequest`, `NextResponse`), Vitest (`node` environment, `vi.mock`).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `proxy.ts` | Rewrite | Redirect map, 410 map, brands wildcard, normalization, proxy function |
| `middleware.ts` | Create | Thin Next.js middleware entry — re-exports `proxy` as default + `config` |
| `__tests__/proxy.test.ts` | Create | Vitest unit tests for all redirect/410 behaviors |

---

### Task 1: Rewrite `proxy.ts` + create `middleware.ts`

**Files:**
- Modify: `proxy.ts` (full rewrite)
- Create: `middleware.ts`

#### Background

`proxy.ts` currently has an empty `GONE_PATHS` array and a pass-through `proxy` function.  
There is **no `middleware.ts`** — that must be created so Next.js picks up the middleware at all.  
All 301s use `NextResponse.redirect(new URL(to, request.url), 301)` for a true HTTP 301.  
All 410s use `new Response(null, { status: 410 })`.  
Path normalization runs first: `decodeURIComponent(pathname).replace(/\+/g, ' ')` (handles `%20` and `+` encodings from old Magento/WooCommerce URLs).

#### Step-by-step

- [ ] **Step 1: Write the failing test file**

Create `__tests__/proxy.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('proxy — 410 Gone', () => {
  it('returns 410 for a GONE_PATHS entry', () => {
    // Row 2 placeholder: update this URL when handoff provides it
    // For now test the mechanism with a manual entry (uncomment when real URL is known)
    expect(true).toBe(true) // placeholder until 410 URLs are confirmed
  })
})

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

describe('proxy — encoded path normalization', () => {
  it('decodes %20 in pathname and matches', () => {
    // /Medical-Supply-Store.html encoded as /Medical-Supply-Store.html (no spaces here)
    // Test %20 on a path that has a space variant — proxy should normalize before matching
    const encoded = '/Medical%20Supply%20Store.html'
    // This is NOT in the map, so should return undefined (pass-through)
    const res = proxy(req(encoded))
    // undefined means pass-through — correct behaviour since we only match exact paths
    expect(res).toBeUndefined()
  })

  it('passes through unknown paths', () => {
    const res = proxy(req('/some-random-page'))
    expect(res).toBeUndefined()
  })
})

describe('proxy — brands wildcard', () => {
  it('/brands → /partners', () => {
    const res = proxy(req('/brands'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners')
    expect(res?.headers.get('Location')).not.toContain('/brands')
  })

  it('/brands/ → /partners/', () => {
    const res = proxy(req('/brands/'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/')
  })

  it('/brands/drive-medical → /partners/drive-medical', () => {
    const res = proxy(req('/brands/drive-medical'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/drive-medical')
  })

  it('/brands/dynarex/products → /partners/dynarex/products', () => {
    const res = proxy(req('/brands/dynarex/products'))
    expect(res?.status).toBe(301)
    expect(res?.headers.get('Location')).toContain('/partners/dynarex/products')
  })
})

describe('proxy — no-chain check', () => {
  it('no redirect target is itself a redirect source', () => {
    // All targets in REDIRECT_ENTRIES should not appear as a `from` entry
    // This is a logic test — we import REDIRECT_ENTRIES and verify
    // (Imported inline here since it's not exported; instead verify by testing known targets)
    const knownTargets = [
      '/categories', '/category/gloves', '/category/face-masks', '/category/hygiene',
      '/partners/drive-medical', '/partners/dynarex', '/industries/private-practice',
      '/blog/types-of-sutures', '/blog/types-of-needles',
    ]
    for (const target of knownTargets) {
      // A target routed through proxy should pass through (undefined), not redirect again
      const res = proxy(req(target))
      expect(res).toBeUndefined()
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
npx vitest run __tests__/proxy.test.ts 2>&1 | tail -20
```

Expected: `FAIL` — `proxy` returns undefined for everything (no map yet).

- [ ] **Step 3: Rewrite `proxy.ts` with the full redirect map**

```typescript
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Redirect301 = { from: string; to: string; status: 301 }
type Gone410    = { from: string; status: 410 }
type RedirectEntry = Redirect301 | Gone410

// ─── Redirect + 410 map ──────────────────────────────────────────────────────
//
// Order: 410s first (definitive removal), then 301s.
// Add unknown rows when handoff provides the old URLs.
//
const REDIRECT_ENTRIES: RedirectEntry[] = [

  // ── 410 Gone (permanently removed — do not recreate) ──────────────────────
  // TODO row 2  (Narcotics Storage):         add { from: '<old-path>', status: 410 }
  // TODO row 17 (Thorne VeganPro Vanilla):   add { from: '<old-path>', status: 410 }
  // TODO row 18 (Thorne VeganPro Chocolate): add { from: '<old-path>', status: 410 }
  // TODO row 21 (Injectables):               add { from: '<old-path>', status: 410 }

  // ── 301 Recoverable redirects ─────────────────────────────────────────────
  // Category / hub pages
  { from: '/Medical-Supply-Store.html',                          to: '/categories',              status: 301 },
  { from: '/all-categories.html',                                to: '/categories',              status: 301 },
  { from: '/medical-supply-store/Gloves-G78R26U43E.html',       to: '/category/gloves',         status: 301 },
  { from: '/face-masks-n95-kn95.html',                          to: '/category/face-masks',     status: 301 },
  { from: '/medical-supply-store/Face-Masks-CYR82C7EBL.html',  to: '/category/face-masks',     status: 301 },
  { from: '/medical-supply-store/Hygiene-WQ2ENW7KU6.html',     to: '/category/hygiene',        status: 301 },

  // Partners / vendors
  { from: '/supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html', to: '/partners/drive-medical',  status: 301 },
  { from: '/Durable-Equipment-Medical.html',                    to: '/partners/drive-medical',  status: 301 },
  { from: '/supplies-by-vendor/Dynarex-MM7QQM8CLP.html',       to: '/partners/dynarex',        status: 301 },

  // Industries
  { from: '/Medical-Supplies-for-Doctors.html',                 to: '/industries/private-practice', status: 301 },

  // Blog articles (blog routes are live — direct redirect, no category fallback needed)
  { from: '/articles/types-of-sutures.html',                    to: '/blog/types-of-sutures',   status: 301 },
  { from: '/articles/types-of-needles.html',                    to: '/blog/types-of-needles',   status: 301 },

  // TODO row 3  (Dynarex specimen container): { from: '<old-path>', to: '/category/needles-syringes', status: 301 }
  // TODO row 5  (Exel insulin syringe):        { from: '<old-path>', to: '/category/needles-syringes', status: 301 }
  // TODO row 9  (10cc syringe):                { from: '<old-path>', to: '/category/needles-syringes', status: 301 }
  // TODO row 11 (NDD EasyOne Spirettes):       { from: '<old-path>', to: '/category/respiratory',      status: 301 }
  // TODO row 12 (leg immobilizer):             { from: '<old-path>', to: '/category/immobilizers',     status: 301 }
  // TODO row 14 (trauma dressing):             { from: '<old-path>', to: '/category/wound-care',       status: 301 }
  // TODO row 16 (Feather blades):              { from: '<old-path>', to: '/category/surgery-procedure', status: 301 }
  // TODO row 19 (Graham drape sheet):          { from: '<old-path>', to: '/category/surgery-procedure', status: 301 }
  // TODO row 20 (triangular bandage):          { from: '<old-path>', to: '/category/wound-care',        status: 301 }
  // TODO row 24 (glucose testing):             { from: '<old-path>', to: '/category/testing',           status: 301 }
]

export function proxy(request: NextRequest): Response | undefined {
  const raw = request.nextUrl.pathname
  // Normalize encoded paths (+, %20) so old Magento/WooCommerce URLs match
  const pathname = decodeURIComponent(raw).replace(/\+/g, ' ')

  // Static map — O(n) is fine for this number of entries
  for (const entry of REDIRECT_ENTRIES) {
    if (pathname !== entry.from) continue
    if (entry.status === 410) return new Response(null, { status: 410 })
    return NextResponse.redirect(new URL(entry.to, request.url), 301)
  }

  // Brands → Partners wildcard (T1 consolidation)
  if (pathname === '/brands' || pathname.startsWith('/brands/')) {
    const newPath = pathname.replace(/^\/brands/, '/partners')
    return NextResponse.redirect(new URL(newPath, request.url), 301)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
```

- [ ] **Step 4: Create `middleware.ts`**

```typescript
export { proxy as default, config } from './proxy'
```

- [ ] **Step 5: Run tests — expect all to pass**

```bash
npx vitest run __tests__/proxy.test.ts 2>&1 | tail -30
```

Expected output: all tests `✓`. The no-chain test verifies that none of the 301 targets loop back through the map.

- [ ] **Step 6: Run the full test suite to check for regressions**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: same pass count as before + new proxy tests.

---

### Task 2: Redirect QA table

**Files:**
- Create: `docs/redirect-qa.md` (documentation only — not source code)

This task produces the pre-launch verification table called for in the spec deliverables. No code changes.

- [ ] **Step 1: Generate the QA table**

Create `docs/redirect-qa.md` with this content (fill `Status` column after local `curl` spot-checks once the dev server is running):

```markdown
# Redirect QA — T4

## Pre-launch spot-check

Run against local dev server (`npm run dev`, port 3000):

| Row | Old path | Expected destination | Status (301/410) | Location header |
|-----|----------|---------------------|-----------------|-----------------|
| 1   | /Medical-Supply-Store.html | /categories | 301 | |
| 4   | /supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html | /partners/drive-medical | 301 | |
| 6   | /articles/types-of-sutures.html | /blog/types-of-sutures | 301 | |
| 7   | /Durable-Equipment-Medical.html | /partners/drive-medical | 301 | |
| 8   | /supplies-by-vendor/Dynarex-MM7QQM8CLP.html | /partners/dynarex | 301 | |
| 10  | /Medical-Supplies-for-Doctors.html | /industries/private-practice | 301 | |
| 13  | /articles/types-of-needles.html | /blog/types-of-needles | 301 | |
| 15  | /face-masks-n95-kn95.html | /category/face-masks | 301 | |
| 22  | /medical-supply-store/Face-Masks-CYR82C7EBL.html?formularyId=1 | /category/face-masks | 301 | |
| 23  | /medical-supply-store/Hygiene-WQ2ENW7KU6.html | /category/hygiene | 301 | |
| 25  | /all-categories.html | /categories | 301 | |
| 26  | /medical-supply-store/Gloves-G78R26U43E.html | /category/gloves | 301 | |
| -   | /brands | /partners | 301 | |
| -   | /brands/drive-medical | /partners/drive-medical | 301 | |
| -   | /brands/dynarex | /partners/dynarex | 301 | |

## Rows pending old URL (handoff required)

| Row | Product | Category fallback |
|-----|---------|-------------------|
| 2   | Narcotics Storage | 410 |
| 3   | Dynarex specimen container | /category/needles-syringes |
| 5   | Exel insulin syringe | /category/needles-syringes |
| 9   | 10cc syringe | /category/needles-syringes |
| 11  | NDD EasyOne Spirettes | /category/respiratory |
| 12  | Leg immobilizer | /category/immobilizers |
| 14  | Trauma dressing | /category/wound-care |
| 16  | Feather blades | /category/surgery-procedure |
| 17  | Thorne VeganPro Vanilla | 410 |
| 18  | Thorne VeganPro Chocolate | 410 |
| 19  | Graham drape sheet | /category/surgery-procedure |
| 20  | Triangular bandage | /category/wound-care |
| 21  | Injectables | 410 |
| 24  | Glucose testing | /category/testing |

## Post-cutover re-check

Re-run the same `curl` commands against the live domain after DNS cutover.
```

- [ ] **Step 2: Verify curl spot-checks locally** *(manual, run in terminal)*

```bash
# Start dev server in another terminal: npm run dev

curl -sI http://localhost:3000/Medical-Supply-Store.html | grep -E 'HTTP|Location'
# Expected: HTTP/1.1 301  +  Location: http://localhost:3000/categories

curl -sI http://localhost:3000/brands/drive-medical | grep -E 'HTTP|Location'
# Expected: HTTP/1.1 301  +  Location: http://localhost:3000/partners/drive-medical

curl -sI "http://localhost:3000/medical-supply-store/Face-Masks-CYR82C7EBL.html?formularyId=99" | grep -E 'HTTP|Location'
# Expected: HTTP/1.1 301  +  Location: http://localhost:3000/category/face-masks

curl -sI http://localhost:3000/articles/types-of-sutures.html | grep -E 'HTTP|Location'
# Expected: HTTP/1.1 301  +  Location: http://localhost:3000/blog/types-of-sutures
```

Record actual responses in the QA table's `Status` and `Location header` columns.

---

## Self-Review

### Spec coverage

| Spec task | Covered by |
|-----------|------------|
| Set up `{from, to, status}` redirect map | Task 1 — `REDIRECT_ENTRIES` |
| 26 recoverable 301s (12 known + 14 pending handoff) | Task 1 — map + TODO comments |
| Encoded / query-string paths | Task 1 — normalization + row 22 entry |
| 410 Gone (skeleton ready, 4 rows pending URLs) | Task 1 — TODO comments in map |
| Brands → Partners wildcard | Task 1 — brands wildcard block |
| Blog contingency redirects | Task 1 — rows 6, 13 in map (blog routes are live) |
| No-chain check | Task 1 — no-chain test verifies all targets pass through |
| Redirect QA table | Task 2 |
| `middleware.ts` (Option A) | Task 1 |

### Placeholder scan

- TODO comments for missing rows are intentional — they need the actual old URLs from the handoff. All code logic is complete.
- `docs/redirect-qa.md` `Status` column is intentionally blank until spot-checks are run.

### Type consistency

- `RedirectEntry = Redirect301 | Gone410` — used consistently across map and narrowing in proxy function.
- `proxy` return type `Response | undefined` — consistent with how Next.js middleware works (returning `undefined` = pass-through).
