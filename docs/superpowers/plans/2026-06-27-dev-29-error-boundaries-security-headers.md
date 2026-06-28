# DEV-29: Error Boundaries, Security Headers & Graceful Failures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add error boundaries for product/category/account routes, security headers (including Report-Only CSP) in `next.config.ts`, structured server-side error logging, and an 8-second Storefront fetch timeout — all in one PR with zero new npm dependencies.

**Architecture:** A shared `ErrorPage` component holds all error UI; thin `error.tsx` wrappers in each route segment pass route-specific copy. `lib/log-error.ts` is the single structured-logging utility; `storefrontFetch` in `lib/shopify/storefront.ts` calls it at both throw sites and applies a default 8-second timeout. Security headers live in `next.config.ts`'s `headers()` export.

**Tech Stack:** Next.js App Router, Vitest (node + jsdom projects), @testing-library/react, TypeScript.

## Global Constraints

- Zero new npm dependencies — no Sentry, no extra packages.
- All error boundary files must be `'use client'` (Next.js requirement).
- CSP mode is `Content-Security-Policy-Report-Only` — NOT enforcing. Do not ship `Content-Security-Policy`.
- `AbortSignal.timeout(ms)` requires Node 17.3+; this project targets Node 18+ — no polyfill needed.
- Test framework: Vitest. Run node-environment tests with `--project=node`; jsdom/component tests with `--project=component`.
- Follow the visual pattern of `app/not-found.tsx` exactly: teal-500 eyebrow, navy-900 heading, gray-500 body, two buttons, gray-400 support code footnote.
- Never expose stack traces, token values, GraphQL query bodies, or customer PII in log output.

---

### Task 1: Structured server error logger (`lib/log-error.ts`)

**Files:**
- Create: `lib/__tests__/log-error.test.ts`
- Create: `lib/log-error.ts`

**Interfaces:**
- Produces: `logServerError(context: string, err: unknown): void` — used by Task 2.

---

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/log-error.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('logServerError', () => {
  it('logs a structured JSON object to console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logServerError } = await import('@/lib/log-error')
    logServerError('storefront', new Error('fetch failed'))
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.context).toBe('storefront')
    expect(logged.message).toBe('fetch failed')
    expect(logged.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    spy.mockRestore()
  })

  it('handles non-Error values', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logServerError } = await import('@/lib/log-error')
    logServerError('cart', 'something bad')
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.message).toBe('something bad')
    spy.mockRestore()
  })

  it('does not log stack trace in output', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { logServerError } = await import('@/lib/log-error')
    const err = new Error('oops')
    err.stack = 'Error: oops\n    at lib/shopify/storefront.ts:42'
    logServerError('storefront', err)
    const raw = spy.mock.calls[0][0]
    expect(raw).not.toContain('stack')
    expect(raw).not.toContain('storefront.ts')
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run the tests — expect FAIL**

```
npx vitest run --project=node lib/__tests__/log-error.test.ts
```

Expected output: 3 tests fail with "Cannot find module '@/lib/log-error'".

- [ ] **Step 3: Implement `lib/log-error.ts`**

```ts
import 'server-only'

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

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run --project=node lib/__tests__/log-error.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/log-error.ts lib/__tests__/log-error.test.ts
git commit -m "feat: add structured server error logger"
```

---

### Task 2: Storefront timeout + logging (`lib/shopify/storefront.ts`)

**Files:**
- Create: `lib/shopify/__tests__/storefront-error.test.ts`
- Modify: `lib/shopify/storefront.ts`

**Interfaces:**
- Consumes: `logServerError` from `@/lib/log-error` (Task 1).
- Produces: `storefrontFetch` now throws within 8 s on timeout; logs structured JSON before every throw.

---

- [ ] **Step 1: Write the failing tests**

Create `lib/shopify/__tests__/storefront-error.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'admin-token')
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('BUNNYCDN_STORAGE_ACCESS_KEY', 'bunny-key')
})

describe('storefrontFetch error handling', () => {
  it('logs and throws on non-ok HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { storefrontFetch } = await import('../storefront')
    await expect(storefrontFetch('query { x }')).rejects.toThrow('503')
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.context).toBe('storefront')
    expect(logged.message).toContain('503')
    spy.mockRestore()
  })

  it('logs and throws on GraphQL errors', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'Field not found' }] }),
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { storefrontFetch } = await import('../storefront')
    await expect(storefrontFetch('query { x }')).rejects.toThrow('Field not found')
    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0])
    expect(logged.message).toBe('Field not found')
    spy.mockRestore()
  })

  it('applies an 8-second AbortSignal timeout by default', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { x: 1 } }),
    })
    const { storefrontFetch } = await import('../storefront')
    await storefrontFetch('query { x }')
    expect(timeoutSpy).toHaveBeenCalledWith(8000)
    timeoutSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run --project=node lib/shopify/__tests__/storefront-error.test.ts
```

Expected: tests fail because no logging happens and no timeout is applied.

- [ ] **Step 3: Modify `lib/shopify/storefront.ts`**

Add the import at the top (after existing imports):

```ts
import { logServerError } from '@/lib/log-error'
```

In `cachedRequest`, change the `fetch` call and the `!res.ok` block:

```ts
  const res = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
    ...fetchOptions,
  });

  if (!res.ok) {
    const message = `Storefront API HTTP ${res.status}: ${res.statusText}`;
    logServerError('storefront', new Error(message));
    throw new Error(message);
  }
```

In `storefrontFetch`, change the GraphQL error block:

```ts
  if (json.errors?.length) {
    const message = json.errors.map((e: { message: string }) => e.message).join('\n');
    logServerError('storefront', new Error(message));
    throw new Error(message);
  }
```

- [ ] **Step 4: Run new tests — expect PASS**

```
npx vitest run --project=node lib/shopify/__tests__/storefront-error.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Run existing caching test to confirm no regression**

```
npx vitest run --project=node lib/shopify/__tests__/storefront-cache.test.ts
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add lib/shopify/storefront.ts lib/shopify/__tests__/storefront-error.test.ts
git commit -m "feat: add 8s fetch timeout and structured error logging to storefrontFetch"
```

---

### Task 3: Shared `ErrorPage` component

**Files:**
- Create: `components/error/ErrorPage.tsx`
- Create: `components/error/__tests__/ErrorPage.test.tsx`

**Interfaces:**
- Produces: `ErrorPage({ eyebrow, heading, body, onRetry, secondaryLabel, secondaryHref, supportCode })` — consumed by all error.tsx wrappers in Task 4.

---

- [ ] **Step 1: Write the failing test**

Create `components/error/__tests__/ErrorPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ErrorPage } from '../ErrorPage'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const defaultProps = {
  eyebrow: 'Something went wrong',
  heading: 'Page Failed',
  body: 'Please try again.',
  onRetry: vi.fn(),
  secondaryLabel: 'Go Home',
  secondaryHref: '/',
  supportCode: 'abc-1234',
}

describe('ErrorPage', () => {
  it('renders eyebrow, heading, and body text', () => {
    render(<ErrorPage {...defaultProps} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page Failed' })).toBeInTheDocument()
    expect(screen.getByText('Please try again.')).toBeInTheDocument()
  })

  it('calls onRetry when Try Again button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorPage {...defaultProps} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders secondary link with correct href and label', () => {
    render(<ErrorPage {...defaultProps} />)
    const link = screen.getByRole('link', { name: 'Go Home' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('displays the support code', () => {
    render(<ErrorPage {...defaultProps} />)
    expect(screen.getByText(/abc-1234/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run --project=component components/error/__tests__/ErrorPage.test.tsx
```

Expected: 4 tests fail with "Cannot find module '../ErrorPage'".

- [ ] **Step 3: Implement `components/error/ErrorPage.tsx`**

```tsx
'use client'
import Link from 'next/link'

interface ErrorPageProps {
  eyebrow: string
  heading: string
  body: string
  onRetry: () => void
  secondaryLabel: string
  secondaryHref: string
  supportCode: string
}

export function ErrorPage({
  eyebrow,
  heading,
  body,
  onRetry,
  secondaryLabel,
  secondaryHref,
  supportCode,
}: ErrorPageProps) {
  return (
    <main className="bg-[#f9fafc] min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
        {eyebrow}
      </p>
      <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
        {heading}
      </h1>
      <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
        {body}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onRetry}
          className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
        >
          Try Again
        </button>
        <Link
          href={secondaryHref}
          className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
        >
          {secondaryLabel}
        </Link>
      </div>
      <p className="text-gray-400 text-[12px] mt-8">
        Support code: {supportCode}
      </p>
    </main>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run --project=component components/error/__tests__/ErrorPage.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/error/ErrorPage.tsx components/error/__tests__/ErrorPage.test.tsx
git commit -m "feat: add shared ErrorPage component for error boundaries"
```

---

### Task 4: Error boundary wrappers (all 5 route files)

**Files:**
- Create: `app/global-error.tsx`
- Create: `app/error.tsx`
- Create: `app/product/[slug]/error.tsx`
- Create: `app/category/[slug]/error.tsx`
- Create: `app/(noindex)/account/error.tsx`

**Interfaces:**
- Consumes: `ErrorPage` from `@/components/error/ErrorPage` (Task 3) — all except `global-error.tsx`.
- Each file receives `{ error: Error & { digest?: string }; reset: () => void }` from Next.js.

These are thin wrappers; correctness of the shared UI is covered by Task 3's component tests. Manual smoke-test instructions are at the end of this task.

---

- [ ] **Step 1: Create `app/global-error.tsx`**

This file must render its own `<html>` and `<body>` because the root layout is bypassed when it fires. Use a plain `<a>` tag instead of `next/link` — the Router context may be unavailable.

```tsx
'use client'
import { useState } from 'react'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f9fafc]">
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
            Something went wrong
          </p>
          <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
            Unexpected Error
          </h1>
          <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
            A critical error occurred. Please refresh the page or return home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={reset}
              className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
            >
              Go Home
            </a>
          </div>
          <p className="text-gray-400 text-[12px] mt-8">
            Support code: {supportCode}
          </p>
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `app/error.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Page Failed to Load"
      body="An unexpected error occurred. Please try again or browse our categories."
      onRetry={reset}
      secondaryLabel="Browse Categories"
      secondaryHref="/categories"
      supportCode={supportCode}
    />
  )
}
```

- [ ] **Step 3: Create `app/product/[slug]/error.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function ProductError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Product Unavailable"
      body="We couldn't load this product. Please try again or browse our categories."
      onRetry={reset}
      secondaryLabel="Browse Categories"
      secondaryHref="/categories"
      supportCode={supportCode}
    />
  )
}
```

- [ ] **Step 4: Create `app/category/[slug]/error.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function CategoryError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Category Unavailable"
      body="We couldn't load this category. Please try again or view all categories."
      onRetry={reset}
      secondaryLabel="All Categories"
      secondaryHref="/categories"
      supportCode={supportCode}
    />
  )
}
```

- [ ] **Step 5: Create `app/(noindex)/account/error.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Account Unavailable"
      body="We couldn't load your account. Please try again or return to the home page."
      onRetry={reset}
      secondaryLabel="Go Home"
      secondaryHref="/"
      supportCode={supportCode}
    />
  )
}
```

- [ ] **Step 6: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors relating to the new error files.

- [ ] **Step 7: Commit**

```bash
git add app/global-error.tsx app/error.tsx "app/product/[slug]/error.tsx" "app/category/[slug]/error.tsx" "app/(noindex)/account/error.tsx"
git commit -m "feat: add route-level error boundaries with retry UI"
```

- [ ] **Step 8: Manual smoke test**

Start the dev server (`npm run dev`) and trigger each error boundary:

| Route | How to trigger |
|-------|---------------|
| `app/error.tsx` | Temporarily throw in `app/page.tsx` server component, visit `/` |
| `app/product/[slug]/error.tsx` | Temporarily throw in `app/product/[slug]/page.tsx`, visit any product URL |
| `app/category/[slug]/error.tsx` | Temporarily throw in `app/category/[slug]/page.tsx`, visit any category URL |
| `app/(noindex)/account/error.tsx` | Temporarily throw in `app/(noindex)/account/page.tsx`, visit `/account` |

For each: confirm teal eyebrow, large navy heading, gray body, "Try Again" button, secondary link, and a support code are visible. Confirm clicking "Try Again" re-renders (retry works). Remove the temporary throws after testing.

---

### Task 5: Security headers + source map config (`next.config.ts`)

**Files:**
- Create: `__tests__/next-config.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `next.config.ts` with `async headers()` returning security headers for all routes; `productionBrowserSourceMaps: false` explicitly set.

---

- [ ] **Step 1: Write the failing test**

Create `__tests__/next-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import nextConfig from '@/next.config'

describe('next.config headers()', () => {
  it('returns exactly one rule matching all routes', async () => {
    const rules = await nextConfig.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe('/(.*)')
  })

  it('includes all five required security headers', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
    expect(keys).toContain('Referrer-Policy')
    expect(keys).toContain('Permissions-Policy')
    expect(keys).toContain('Content-Security-Policy-Report-Only')
  })

  it('X-Content-Type-Options is nosniff', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'X-Content-Type-Options')
    expect(h?.value).toBe('nosniff')
  })

  it('X-Frame-Options is SAMEORIGIN', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'X-Frame-Options')
    expect(h?.value).toBe('SAMEORIGIN')
  })

  it('Referrer-Policy is strict-origin-when-cross-origin', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'Referrer-Policy')
    expect(h?.value).toBe('strict-origin-when-cross-origin')
  })

  it('CSP Report-Only contains required directives and sources', async () => {
    const rules = await nextConfig.headers!()
    const h = rules[0].headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')
    const value = h?.value ?? ''
    expect(value).toContain("default-src 'self'")
    expect(value).toContain('https://www.googletagmanager.com')
    expect(value).toContain('https://cdn.shopify.com')
    expect(value).toContain("object-src 'none'")
    expect(value).toContain("frame-ancestors 'self'")
    expect(value).toContain("base-uri 'self'")
  })

  it('does NOT ship an enforcing Content-Security-Policy header', async () => {
    const rules = await nextConfig.headers!()
    const keys = rules[0].headers.map((h) => h.key)
    expect(keys).not.toContain('Content-Security-Policy')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run --project=node __tests__/next-config.test.ts
```

Expected: tests fail because `next.config.ts` has no `headers()`.

- [ ] **Step 3: Modify `next.config.ts`**

Replace the entire file with:

```ts
import type { NextConfig } from "next";

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.shopify.com https://www.googletagmanager.com https://www.google-analytics.com",
  "font-src 'self'",
  "connect-src 'self' https://daebb2-76.myshopify.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
  "frame-src https://shopify.com https://checkout.shopify.com https://daebb2-76.myshopify.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

const nextConfig: NextConfig = {
  // Allow the dev server to be reached through ngrok. Next blocks cross-origin
  // dev requests by default, which breaks the HMR WebSocket and hydration when
  // the app is loaded from a tunnel host instead of localhost. The wildcards
  // cover any teammate's free ngrok tunnel (free domains come in both flavours).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],

  // Explicit: Next.js already omits source maps in production, but this
  // documents the intent in the config file.
  productionBrowserSourceMaps: false,

  images: {
    // localPatterns is an allowlist: once set, every other local next/image
    // src is blocked, so pre-existing local images (e.g. /images/logo.avif)
    // must be listed alongside the BunnyCDN proxy path.
    localPatterns: [{ pathname: "/api/bunny/**" }, { pathname: "/images/**" }],
    // Shopify product/variant images are served directly from cdn.shopify.com
    // (Storefront API image URLs) — these are remote, not local, so they need
    // an explicit remotePattern. BunnyCDN itself needs no entry here: it has no
    // public Pull Zone, so every BunnyCDN read already goes through the
    // same-origin /api/bunny proxy above (see lib/bunnycdn.ts).
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ]
  },
};

export default nextConfig;
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run --project=node __tests__/next-config.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts __tests__/next-config.test.ts
git commit -m "feat: add security headers and Report-Only CSP to next.config.ts"
```

---

### Task 6: Full test suite + TypeScript verification

**Files:** No new files. Runs the full suite to confirm no regressions.

---

- [ ] **Step 1: Run all Vitest tests**

```
npx vitest run
```

Expected: all tests pass. If any existing tests fail that previously passed, investigate before continuing.

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Lint**

```
npx eslint .
```

Expected: zero new lint errors introduced by this branch.

- [ ] **Step 4: Verify headers in dev**

```
npm run dev
```

In another terminal:

```
curl -s -I http://localhost:3000 | grep -i "x-content\|x-frame\|referrer\|permissions\|content-security"
```

Expected: all five security headers present in the response.

- [ ] **Step 5: Final commit (if any stray fixes)**

If the lint or tsc steps required small fixes, commit them now:

```bash
git add -p
git commit -m "fix: address lint/type issues from DEV-29"
```
