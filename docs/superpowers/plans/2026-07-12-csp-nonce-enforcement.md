# CSP Nonce Enforcement (M10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move CSP from a do-nothing `Report-Only` header to an enforcing policy with per-request nonces on every inline/GTM script, backed by a real violation-report endpoint, with `'unsafe-inline'` removed from `script-src`.

**Architecture:** Next.js can only inject a nonce into inline scripts at **request time** — static/ISR pages have no request context, so nonce-based CSP requires every page in the nonce'd tree to render dynamically. The user has explicitly accepted this trade-off (site-wide dynamic rendering) over the alternative (scoping nonces to already-dynamic routes only). CSP generation moves from `next.config.ts` (static, build-time) to `proxy.ts` (per-request, generates a fresh nonce + sets both the enforcing and Report-Only headers on every response). `app/layout.tsx` reads the nonce via `headers()` and passes it to `GoogleTagManager` and its own inline JSON-LD script; every other file rendering an inline `<script>` (5 schema components + 4 page-level raw `<script>` blocks) reads the same nonce independently via a small helper — no prop drilling through the ~15 call sites of the schema components.

**Tech Stack:** Next.js App Router `proxy.ts` (this Next version's `middleware.ts` replacement — see `AGENTS.md`), Web Crypto (`crypto.randomUUID()`), Vitest.

## Global Constraints

- `'unsafe-inline'` must be gone from `script-src` in the enforcing header (ticket AC).
- `style-src 'unsafe-inline'` stays — out of scope (ticket only calls out scripts).
- The existing 4 static headers in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are untouched.
- GTM/GA4 must still fire under the nonce (dependency: analytics/E6) — verified via `nonce` prop on `<GoogleTagManager>`, which `@next/third-parties/google` applies to both its inline init script and its loader `<script src>` (confirmed in `node_modules/@next/third-parties/dist/google/gtm.js`).
- Known follow-on (not in scope here): once every route is dynamically rendered, the `proxy.ts` rewrite of `/category/<slug>?sort|filter|page` → `/category-browse/<slug>` (audit H1, needed because the canonical route was statically generated) becomes redundant. Leaving it in place — it's still correct, just no longer load-bearing. Flagged for a future cleanup ticket, not touched here.

---

### Task 1: CSP builder + nonce generator (`lib/csp.ts`)

**Files:**
- Create: `lib/csp.ts`
- Test: `lib/__tests__/csp.test.ts`

- [ ] Write `lib/csp.ts`:

```ts
export const CSP_REPORT_URI = '/api/csp-report'

/** Per-request nonce, matching the recipe in the Next.js CSP guide
 *  (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md)
 *  so Next's automatic nonce-extraction from the CSP header keeps working. */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

/** Builds the CSP header value. Used identically for both the enforcing
 *  and the parallel Report-Only header during rollout (M10) — Report-Only
 *  stays live after rollout too, as an ongoing regression canary that
 *  reports violations without blocking, independent of what the enforcing
 *  header already blocked. */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.shopify.com https://www.googletagmanager.com https://www.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://daebb2-76.myshopify.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
    "frame-src https://shopify.com https://checkout.shopify.com https://daebb2-76.myshopify.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `report-uri ${CSP_REPORT_URI}`,
  ].join('; ')
}
```

- [ ] Test `lib/__tests__/csp.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCsp, generateNonce, CSP_REPORT_URI } from '@/lib/csp'

describe('generateNonce', () => {
  it('produces a fresh value every call', () => {
    expect(generateNonce()).not.toBe(generateNonce())
  })
})

describe('buildCsp', () => {
  it('is enforcing-ready: no unsafe-inline in script-src', () => {
    const csp = buildCsp('abc123', false)
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'))!
    expect(scriptSrc).not.toContain('unsafe-inline')
    expect(scriptSrc).toContain("'nonce-abc123'")
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).toContain('https://www.googletagmanager.com')
  })

  it('adds unsafe-eval only in dev (React dev-mode stack traces)', () => {
    expect(buildCsp('n', true)).toContain("'unsafe-eval'")
    expect(buildCsp('n', false)).not.toContain("'unsafe-eval'")
  })

  it('carries the report-uri directive', () => {
    expect(buildCsp('n', false)).toContain(`report-uri ${CSP_REPORT_URI}`)
  })

  it('preserves the pre-existing allowlist (img/connect/frame/etc.)', () => {
    const csp = buildCsp('n', false)
    expect(csp).toContain('https://cdn.shopify.com')
    expect(csp).toContain('https://daebb2-76.myshopify.com')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("base-uri 'self'")
  })
})
```

- [ ] Run: `npx vitest run lib/__tests__/csp.test.ts` — expect PASS.
- [ ] Commit.

---

### Task 2: `proxy.ts` sets the nonce + enforcing/Report-Only headers on every response

**Files:**
- Modify: `proxy.ts`
- Modify: `__tests__/proxy.test.ts` (mock gains `NextResponse.next`; pass-through assertions change from `toBeUndefined()` to asserting a 200 response carrying the CSP headers)

**Interfaces:**
- `proxy(request: NextRequest): Response` — return type changes from `Response | undefined` to `Response` (every path now returns a response so the CSP/nonce headers always ship).

- [ ] In `proxy.ts`, add imports and a `withCsp` helper; generate the nonce once at the top of `proxy()`; wrap every existing `return` in `withCsp(...)`; replace the final implicit pass-through with an explicit `NextResponse.next()` carrying the `x-nonce` request header:

```ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import productRedirects from './docs/redirects-ready.json'
import { buildCsp, generateNonce } from '@/lib/csp'

// ... existing types/constants/GONE_CATEGORY_SLUGS/isGoneCategory unchanged ...

function withCsp(response: Response, nonce: string): Response {
  const isDev = process.env.NODE_ENV === 'development'
  const csp = buildCsp(nonce, isDev)
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('Content-Security-Policy-Report-Only', csp)
  return response
}

export function proxy(request: NextRequest): Response {
  const nonce = generateNonce()
  const raw = request.nextUrl.pathname
  const pathname = raw.replace(/\+/g, ' ')

  if (isGoneCategory(pathname)) return withCsp(new Response(null, { status: 410 }), nonce)

  for (const entry of REDIRECT_ENTRIES) {
    if (pathname !== entry.from) continue
    if (entry.status === 410) return withCsp(new Response(null, { status: 410 }), nonce)
    return withCsp(NextResponse.redirect(new URL(entry.to, request.url), 301), nonce)
  }

  const productTarget = PRODUCT_REDIRECTS.get(pathname)
  if (productTarget) {
    return withCsp(NextResponse.redirect(new URL(productTarget, request.url), 301), nonce)
  }

  if (pathname.startsWith('/products/')) {
    const newPath = pathname.replace(/^\/products\//, '/product/')
    return withCsp(NextResponse.redirect(new URL(newPath, request.url), 301), nonce)
  }

  if (pathname === '/brands' || pathname.startsWith('/brands/')) {
    const newPath = pathname.replace(/^\/brands/, '/partners')
    return withCsp(NextResponse.redirect(new URL(newPath, request.url), 301), nonce)
  }

  const categoryMatch = pathname.match(/^\/category\/([^/]+)$/)
  if (categoryMatch) {
    const query = request.nextUrl.searchParams
    if (query.has('sort') || query.has('filter') || query.has('page')) {
      const url = request.nextUrl.clone()
      url.pathname = `/category-browse/${categoryMatch[1]}`
      return withCsp(NextResponse.rewrite(url), nonce)
    }
  }

  // Pass-through: forward the nonce as a request header so downstream
  // Server Components can read it via headers() (lib/csp-nonce.ts), and
  // set it on the response so the browser enforces against the matching
  // nonce'd inline scripts Next.js renders for this request.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt).*)',
  ],
}
```

- [ ] Update `__tests__/proxy.test.ts`:
  - Extend the `vi.mock('next/server', ...)` block with a `next` static method:
    ```ts
    next: (init?: { request?: { headers?: Headers } }) => {
      const res = new Response(null, { status: 200 })
      if (init?.request?.headers) {
        res.headers.set('x-nonce-forwarded', init.request.headers.get('x-nonce') ?? '')
      }
      return res
    },
    ```
  - Every assertion of the shape `expect(proxy(req(...))).toBeUndefined()` (pass-through cases) becomes:
    ```ts
    const res = proxy(req('/some-random-page'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Security-Policy')).toContain("'strict-dynamic'")
    ```
    Apply this to: `passes through unknown paths`, `passes through canonical targets`, `does not 410 a live category` (×2), `does not rewrite the canonical category page`, `does not rewrite tracking-only queries`, `does not rewrite subcategory/product paths`, `the singular canonical target passes through`, `every singular canonical target passes through`, `/brandsomething passes through`.
  - Add a new describe block:
    ```ts
    describe('proxy — CSP + nonce', () => {
      it('sets an enforcing CSP with a nonce on every response', () => {
        const res = proxy(req('/'))
        const csp = res.headers.get('Content-Security-Policy')
        expect(csp).toMatch(/'nonce-[^']+'/)
        expect(csp).not.toContain('unsafe-inline\' ')
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
    })
    ```

- [ ] Run: `npx vitest run __tests__/proxy.test.ts` — expect PASS.
- [ ] Commit.

---

### Task 3: nonce report endpoint + `lib/csp-nonce.ts` reader helper

**Files:**
- Create: `app/api/csp-report/route.ts`
- Create: `lib/csp-nonce.ts`
- Test: `app/api/csp-report/__tests__/route.test.ts`

- [ ] `lib/csp-nonce.ts`:

```ts
import { headers } from 'next/headers'

/** Reads the per-request CSP nonce proxy.ts set on `x-nonce`. Calling this
 *  forces the caller's route to render dynamically — accepted trade-off,
 *  see docs/superpowers/plans/2026-07-12-csp-nonce-enforcement.md. */
export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined
}
```

- [ ] `app/api/csp-report/route.ts` (reuses the existing bounded-JSON-read guard from the contact-form route):

```ts
import { NextResponse } from 'next/server'
import { readJsonBounded } from '@/lib/forms/guards'
import { logServerError } from '@/lib/log-error'

// Browsers POST here on every CSP violation (report-uri directive, set in
// lib/csp.ts). Reports are `application/csp-report` or `application/json`
// bodies — readJsonBounded doesn't care about content-type, only that the
// body parses as JSON within the size cap.
export async function POST(req: Request): Promise<Response> {
  const read = await readJsonBounded(req, 8_192)
  if (read.ok) {
    logServerError('csp-violation', new Error(JSON.stringify(read.data)))
  }
  // Always 204: a malformed report is still an acknowledged delivery —
  // the browser doesn't retry, and there's nothing actionable in a 4xx here.
  return new NextResponse(null, { status: 204 })
}
```

- [ ] Test `app/api/csp-report/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

const logServerError = vi.fn()
vi.mock('@/lib/log-error', () => ({ logServerError }))

import { POST } from '../route'

describe('POST /api/csp-report', () => {
  it('logs a well-formed violation report and returns 204', async () => {
    logServerError.mockClear()
    const body = JSON.stringify({
      'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'inline' },
    })
    const req = new Request('http://localhost/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body,
    })

    const res = await POST(req)

    expect(res.status).toBe(204)
    expect(logServerError).toHaveBeenCalledWith('csp-violation', expect.any(Error))
  })

  it('still returns 204 on a malformed body (no retry storm)', async () => {
    logServerError.mockClear()
    const req = new Request('http://localhost/api/csp-report', {
      method: 'POST',
      body: 'not json',
    })

    const res = await POST(req)

    expect(res.status).toBe(204)
    expect(logServerError).not.toHaveBeenCalled()
  })
})
```

- [ ] Run: `npx vitest run app/api/csp-report/__tests__/route.test.ts lib/csp-nonce.ts` — expect PASS (the second path is a no-op if there's no test file for the reader; the report-route test is what matters here).
- [ ] Commit.

---

### Task 4: wire the nonce into every inline `<script>` (root layout + GTM)

**Files:**
- Modify: `app/layout.tsx`

- [ ] Add `import { getNonce } from '@/lib/csp-nonce'`, read `const nonce = await getNonce()` in `RootLayout`, pass it to `<GoogleTagManager nonce={nonce} .../>` and the Organization JSON-LD `<script>`. Replace the stale H1 comment (which now describes exactly what we're intentionally doing) with one explaining the new trade-off:

```tsx
// This layout reads headers() for the CSP nonce (lib/csp-nonce.ts), which
// opts every route into dynamic rendering — the accepted trade-off for M10
// (nonce-based CSP enforcement): Next.js can only inject a nonce into inline
// scripts at request time, so ISR/static generation and nonces are mutually
// exclusive. See docs/superpowers/plans/2026-07-12-csp-nonce-enforcement.md.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = await getNonce()
  const [localization, collectionsData, menuData] = await Promise.all([
    // ...unchanged...
  ])
  // ...unchanged...

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      {!isStaging && process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} nonce={nonce} />
      )}
      <body className="min-h-full flex flex-col">
        {!isStaging && (
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
        )}
        <SkipLink />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(buildOrganizationSchema()) }}
        />
        {/* ...unchanged... */}
      </body>
    </html>
  )
}
```

- [ ] Commit.

---

### Task 5: wire the nonce into the 5 schema components

**Files:**
- Modify: `components/schema/ProductSchema.tsx`, `WebPageSchema.tsx`, `FAQSchema.tsx`, `BlogPostingSchema.tsx`, `BreadcrumbSchema.tsx`

Each becomes `async`, reads the nonce internally (no prop drilling — zero changes needed at any of their ~15 call sites; async Server Components render correctly when used as plain JSX by another Server Component). Same edit shape in each file, e.g. `ProductSchema.tsx`:

```tsx
import { safeJsonLd } from '@/lib/safe-json-ld'
import { getNonce } from '@/lib/csp-nonce'

// ...Props interface unchanged...

export async function ProductSchema({ /* ...unchanged destructure... */ }: Props) {
  const nonce = await getNonce()
  // ...unchanged schema object construction...
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}
```

- [ ] Apply the same `async` + `getNonce()` + `nonce={nonce}` change to `WebPageSchema.tsx`, `FAQSchema.tsx`, `BlogPostingSchema.tsx`, `BreadcrumbSchema.tsx` (each has exactly one `<script>` return).
- [ ] Run: `npx tsc --noEmit` — expect no errors (confirms the ~15 call sites still typecheck with no changes).
- [ ] Commit.

---

### Task 6: wire the nonce into the 4 remaining raw `<script>` blocks

**Files:**
- Modify: `app/page.tsx`, `app/categories/page.tsx`, `components/category/CategoryPageView.tsx`, `app/category/[slug]/[product]/page.tsx`

Each is already an `async` function; add `import { getNonce } from '@/lib/csp-nonce'`, `const nonce = await getNonce()` near the top of the component body, and `nonce={nonce}` on its `<script type="application/ld+json">` tag(s). `CategoryPageView.tsx` has two such tags (CollectionPage + BreadcrumbList schemas) — both get the same nonce.

- [ ] Apply to all 4 files.
- [ ] Run: `npx tsc --noEmit` — expect no errors.
- [ ] Commit.

---

### Task 7: retire the static CSP header from `next.config.ts`

**Files:**
- Modify: `next.config.ts`
- Modify: `__tests__/next-config.test.ts`

CSP (both enforcing and Report-Only) is now entirely proxy-generated per request; `next.config.ts`'s static `headers()` can no longer carry it (no per-request nonce available at that layer).

- [ ] Remove `CSP_REPORT_ONLY` and the `Content-Security-Policy-Report-Only` header entry from `next.config.ts`, keeping the other 4 headers untouched.
- [ ] Update `__tests__/next-config.test.ts`: drop the `CSP Report-Only contains required directives` and `does NOT ship an enforcing Content-Security-Policy` tests (both now belong to `lib/csp.test.ts` / `__tests__/proxy.test.ts`), and change the "5 required security headers" test to 4.
- [ ] Run: `npx vitest run __tests__/next-config.test.ts` — expect PASS.
- [ ] Commit.

---

### Task 8: full verification pass

- [ ] `npx vitest run` — all tests pass.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npx eslint proxy.ts lib/csp.ts lib/csp-nonce.ts app/api/csp-report app/layout.tsx components/schema app/page.tsx app/categories/page.tsx components/category/CategoryPageView.tsx "app/category/[slug]/[product]/page.tsx" next.config.ts` — clean.
- [ ] `npm run build` — succeeds (confirms every route that now reads `headers()` still builds; static pages will report as dynamic `ƒ` in the route table instead of `○`/`●` — expected under this plan).
- [ ] `npm run dev`, load `/`, `/category/gloves`, `/product/<handle>`, `/blog/<handle>`:
  - Response headers show an enforcing `Content-Security-Policy` with a `nonce-` value and no `unsafe-inline` in `script-src`.
  - GTM/GA4 fire (check Network tab for `gtm.js` / `collect` requests, or `read_console_messages` for CSP violation warnings — there should be none for first-party/GTM scripts).
  - POST a synthetic report to `/api/csp-report` and confirm it returns 204 (server log line appears).
