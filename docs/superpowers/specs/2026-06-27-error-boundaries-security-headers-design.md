# DEV-29 — Error Boundaries, Security Headers & Graceful Failures

**Date:** 2026-06-27 · **Owner:** Sardorbek · **Priority:** P1  
**Source:** Gap not covered by E1–E10

---

## Problem

- No `app/global-error.tsx` or `app/error.tsx` exist. An unhandled Storefront error on a product or category page renders Next.js's default error screen, exposing framework internals.
- `next.config.ts` has no `headers()` block — zero security headers shipped.
- `storefrontFetch` has no request timeout; a slow Shopify API hangs the render indefinitely.
- Server errors are not logged in a structured way; no support reference code is surfaced to users.

---

## Goals

1. Route + root error boundaries with retry UI matching the site's visual language.
2. Security headers + a Report-Only CSP compatible with Shopify / BunnyCDN / GTM.
3. Structured server-side error logging (Vercel logs); no tokens / stacks / customer data exposed.
4. 8-second Storefront fetch timeout as a hard floor.

## Non-Goals

- Nonce-based enforcing CSP — deferred until after Report-Only monitoring confirms no false positives. Enforcement requires middleware to thread a per-request nonce through `layout.tsx`.
- Sentry or any external error monitoring SDK.
- In-app rate limiting or WAF rules (separate DEV-21).
- CI build-time secret scan (follow-up pipeline task).

---

## Architecture

### Approach chosen: Full single PR (Approach B)

All deliverables ship in one PR touching six files with zero new npm dependencies:

| File | Change |
|------|--------|
| `app/global-error.tsx` | New — root error boundary |
| `app/error.tsx` | New — root segment fallback |
| `app/product/[slug]/error.tsx` | New — product route boundary |
| `app/category/[slug]/error.tsx` | New — category route boundary |
| `app/(noindex)/account/error.tsx` | New — account route boundary |
| `lib/log-error.ts` | New — structured server logger |
| `lib/shopify/storefront.ts` | Edit — add timeout + call logServerError |
| `next.config.ts` | Edit — add headers() + productionBrowserSourceMaps |

---

## Section 1 — Error Boundaries

### Files

All error boundary files are `'use client'` components. Next.js requires this — `error.tsx` receives an `Error` object and a `reset` callback from the framework.

| File | Catches | Secondary action |
|------|---------|-----------------|
| `app/global-error.tsx` | Errors thrown inside root `layout.tsx` | "Go Home" |
| `app/error.tsx` | Homepage + any unhandled route segment | "Browse Categories" |
| `app/product/[slug]/error.tsx` | Product page Storefront failures | "Browse Categories" |
| `app/category/[slug]/error.tsx` | Category page Storefront failures | "All Categories" |
| `app/(noindex)/account/error.tsx` | Unexpected account API failures | "Go Home" |

Cart page (`(noindex)/cart`) is excluded: `CartPageClient` is fully client-side and handles its own error states.

### UI pattern

Matches `app/not-found.tsx` exactly for visual consistency:

```
bg-[#f9fafc] min-h-screen flex flex-col items-center justify-center
  teal-500 eyebrow  ← route-specific label, e.g. "Something went wrong"
  navy-900 heading  ← 60px / 80px responsive, e.g. "This Page Failed to Load"
  gray-500 body     ← friendly explanation, no technical detail
  [Try Again]       ← calls reset(), navy-900 filled button
  [Secondary]       ← bordered navy, route-specific link
  Support code: abc-1234  ← small gray text, shown below buttons
```

**Support code** — generated with `crypto.randomUUID().slice(0, 8)` at render time inside the client component. Gives users a reference string for support without any server state.

**`global-error.tsx`** must render its own `<html>` and `<body>` because the root layout is bypassed when it fires. It uses the Manrope font variable via a hardcoded class (cannot import the Next.js font object in a client component). It shows a minimal branded screen with no Header/Footer.

### What is NOT done

Page files (`product/[slug]/page.tsx`, `category/[slug]/page.tsx`) are left without added try/catch. Errors bubble naturally to the error boundary. This keeps pages clean — the boundary is the graceful handling.

---

## Section 2 — Security Headers

### Location

`next.config.ts` — add `async headers()` returning one rule matching `/(.*)`  (all routes and API routes).

### Headers

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy-Report-Only` | see below |

Also add `productionBrowserSourceMaps: false` to the config object (explicit documentation of intent; Next.js already defaults to false in production).

### CSP (Report-Only)

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://cdn.shopify.com https://www.googletagmanager.com https://www.google-analytics.com;
font-src 'self';
connect-src 'self' https://daebb2-76.myshopify.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net;
frame-src https://shopify.com https://checkout.shopify.com https://daebb2-76.myshopify.com;
frame-ancestors 'self';
object-src 'none';
base-uri 'self'
```

### Rationale for notable choices

- **`'unsafe-inline'` in `script-src`** — Next.js injects `__NEXT_DATA__` and hydration chunks as inline scripts. Removing this requires a per-request nonce threaded through `layout.tsx` via middleware — deferred to the enforcing-CSP follow-up.
- **`'unsafe-inline'` in `style-src`** — Tailwind and Framer Motion generate inline styles at runtime.
- **No `fonts.googleapis.com`** — Next.js font API (`next/font/google`) proxies Google Fonts through the same origin at build time. Fonts are served from `'self'`.
- **No BunnyCDN external domain** — BunnyCDN is accessed through the `/api/bunny/` same-origin proxy (`lib/bunnycdn.ts`). No external hostname needed.
- **`frame-src` includes Shopify domains** — Shopify checkout is a redirect, but some Shopify flows use iframes defensively included here.

### Transition to enforcing CSP (future)

1. Add `middleware.ts` — generate a nonce per request, set it as a response header, pass it to `<Script>` and inline scripts via `layout.tsx`.
2. Replace `'unsafe-inline'` with `'nonce-{nonce}'` in `script-src`.
3. Flip `Content-Security-Policy-Report-Only` → `Content-Security-Policy`.
4. Monitor for remaining violations via Vercel logs or a CSP report endpoint.

### `NEXT_PUBLIC_*` audit

Current public vars: `NEXT_PUBLIC_GTM_ID` and `NEXT_PUBLIC_IS_STAGING`. Both are intentionally public. No secrets use the `NEXT_PUBLIC_` prefix. No action needed.

---

## Section 3 — Storefront Timeout + Server Error Logging

### Timeout

In `lib/shopify/storefront.ts`, add `signal: AbortSignal.timeout(8000)` as a default in the `fetch()` call inside `cachedRequest`. This is spread before `...fetchOptions` so callers can still override. If Shopify does not respond within 8 seconds, the fetch throws an `AbortError` which bubbles to the error boundary.

### `lib/log-error.ts`

New file. Server-only. Exports a single function used at the two throw sites in `storefrontFetch`:

```ts
'server-only'

export function logServerError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.error(JSON.stringify({
    level: 'error',
    context,
    message,
    ts: new Date().toISOString(),
  }))
}
```

**Deliberately omitted from log output:**
- Stack traces (not useful in production serverless; Vercel preserves them separately)
- The GraphQL query body (may contain field names)
- Any token values
- Customer data (PII)

### Call sites

1. In `cachedRequest` — after `!res.ok`, log `Storefront HTTP ${res.status}` then throw.
2. In `storefrontFetch` — after `json.errors?.length`, log the joined error messages then throw.

Customer API (`lib/shopify/customer.ts`) and cart actions use `storefrontFetch` indirectly — they benefit automatically.

---

## Section 4 — Source Map & Secret Exposure

### Source maps

`productionBrowserSourceMaps: false` added explicitly to `next.config.ts`. This is already Next.js's production default but documents the intent in the config file.

### Secret exposure

No secrets are prefixed `NEXT_PUBLIC_*`. The two public vars (`GTM_ID`, `IS_STAGING`) are intentionally public. No runtime action needed.

**Follow-up (out of scope for this PR):** Add a CI step that greps `.next/static/**/*.js` for known secret substrings (e.g. `shopifyStorefrontToken`, `BUNNYCDN`) after each production build.

---

## Acceptance Criteria

- [ ] `app/global-error.tsx` renders a branded screen with retry and no internals exposed
- [ ] `app/error.tsx`, product, category, account error boundaries each render with retry
- [ ] `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` present on all routes
- [ ] `Content-Security-Policy-Report-Only` header present; GTM loads correctly; Shopify images load correctly
- [ ] `storefrontFetch` errors log structured JSON to console; no token/stack/PII in output
- [ ] Fetch timeout of 8 s applies to all Storefront requests
- [ ] No source maps in `.next/static/` for production builds
- [ ] `NEXT_PUBLIC_*` vars confirmed non-secret
