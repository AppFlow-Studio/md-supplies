# Performance & Core Web Vitals Audit (Track A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the performance half of the P1 QA ticket for Track A templates (home, category, PDP, OCC, industry, blog, cart, account): fix the one route missing ISR, de-duplicate Shopify Storefront fetches, lock in CLS-safe layout for the header bars, and ship a repeatable Lighthouse audit + report.

**Architecture:** Targeted fixes in existing server components/data layer, one new `cache()` wrapper around `storefrontFetch`, and a Lighthouse CLI script + markdown report (same shape as the prior `docs/superpowers/plans/2026-06-03-b6-cwv-accessibility-audit.md` Track B audit, scoped to Track A routes this time). No new dependencies — Lighthouse runs via `npx lighthouse`, same as B6.

**Tech Stack:** Next.js 16 App Router, React 19 `cache()`, Vitest, Lighthouse CLI (via npx)

## Global Constraints

- Targets (from the ticket): LCP ≤ 2.5s (mobile), INP ≤ 200ms, CLS ≤ 0.1, measured on the **production candidate**.
- This plan runs Lighthouse against the local dev/build server (`localhost:3000`) — see `audit/AUDIT-REPORT-TRACK-A.md`'s "Pending real candidate URL" section, which must be re-run once a production candidate is deployed. Do not report ticket numbers as final until that re-run happens.
- No false delivery/urgency copy, no UI changes beyond what's listed — this is a perf/audit pass, not a redesign.
- Routes in scope (the 8 ticket route types): `/` (home), `/category/[slug]` (category), `/product/[slug]` (PDP), `/solutions/occ` (OCC), `/industries/[industry-slug]` (industry), `/blog/[handle]` (blog), `/(noindex)/cart` (cart), `/(noindex)/account` (account).

---

### Task 1: Fix missing ISR on the homepage

**Files:**
- Modify: `app/page.tsx`
- Test: `__tests__/route-revalidate.test.ts`

Every other major route exports `revalidate` (categories hub uses 60, category/product/blog/industries use 30–3600). `app/page.tsx` exports none, so on Next 16 (which doesn't cache `fetch()` by default) the homepage's `GET_PRODUCTS` call runs on every request — fully dynamic, no ISR. This directly hurts LCP since the hero's `BEST_SELLING` products fetch blocks every render instead of being served from a 60s-old cache.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/route-revalidate.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROUTE_FILES = [
  'app/page.tsx',
  'app/category/[slug]/page.tsx',
  'app/product/[slug]/page.tsx',
  'app/solutions/occ/page.tsx',
  'app/industries/[industry-slug]/page.tsx',
  'app/blog/[handle]/page.tsx',
]

describe('ISR: every data-fetching Track A/B route exports revalidate', () => {
  for (const file of ROUTE_FILES) {
    it(`${file} exports a numeric revalidate`, () => {
      const src = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
      expect(src).toMatch(/export const revalidate = \d+/)
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/route-revalidate.test.ts`
Expected: FAIL — `app/page.tsx` has no `revalidate` export (the other 5 files already pass).

- [ ] **Step 3: Add `revalidate` to the homepage**

In `app/page.tsx`, after the existing imports and before `export const metadata`:

```typescript
export const revalidate = 60
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/route-revalidate.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx __tests__/route-revalidate.test.ts
git commit -m "perf: add missing ISR revalidate to homepage; add regression test"
```

---

### Task 2: De-duplicate Shopify Storefront fetches with request-level memoization

**Files:**
- Modify: `lib/shopify/storefront.ts`
- Test: `lib/shopify/__tests__/storefront-cache.test.ts`

`storefrontFetch` calls the network directly with no request-level memoization. Within a single render pass, if two server components need the same query+variables (e.g., a product page and a child component both reading the same product), each call hits the network independently. Wrapping the network call in React's `cache()` makes repeat calls with identical arguments within one request resolve from memory instead of re-fetching — a pure win with no behavior change for callers.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/shopify/__tests__/storefront-cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ok: true } }),
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'test-token')
})

describe('storefrontFetch request-level memoization', () => {
  it('calls fetch only once for two identical calls within the same request', async () => {
    const { storefrontFetch } = await import('../storefront')
    await storefrontFetch('query Foo { x }', { a: 1 })
    await storefrontFetch('query Foo { x }', { a: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
```

Note: React's `cache()` memoizes per-request in a real Next.js render; in this isolated Vitest module context it memoizes for the lifetime of the imported module instance, which is enough to prove the wrapper is wired up. The dedup window in production is bounded by Next.js's per-request `cache()` scope, not by module lifetime.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/shopify/__tests__/storefront-cache.test.ts`
Expected: FAIL — `fetchMock` called twice (no memoization yet).

- [ ] **Step 3: Wrap the network call in `cache()`**

In `lib/shopify/storefront.ts`, add the import and wrap the exported function body:

```typescript
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { ShopifyResponse } from './types';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
const STOREFRONT_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2026-04/graphql.json`;

const cachedRequest = cache(async function cachedRequest<T>(
  query: string,
  variablesKey: string,
  country: string,
  fetchOptionsKey: string,
): Promise<ShopifyResponse<T>> {
  const variables = variablesKey ? JSON.parse(variablesKey) : undefined;
  const fetchOptions = fetchOptionsKey ? JSON.parse(fetchOptionsKey) : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  };
  if (country && country !== 'US') {
    headers['Shopify-Storefront-Buyer-Country'] = country;
  }

  const res = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    ...fetchOptions,
  });

  if (!res.ok) {
    throw new Error(`Storefront API HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
});

export async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  fetchOptions?: RequestInit,
): Promise<T> {
  let country = 'US';
  try {
    const cookieStore = await cookies();
    country = cookieStore.get('market_country')?.value ?? 'US';
  } catch {
    // Outside a request context (e.g. generateStaticParams at build time)
  }

  const json = await cachedRequest<T>(
    query,
    variables ? JSON.stringify(variables) : '',
    country,
    fetchOptions ? JSON.stringify(fetchOptions) : '',
  );

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  return json.data;
}
```

`variables`/`fetchOptions` are serialized to strings before entering `cache()` because React's `cache()` keys memoization on reference/primitive equality of arguments — passing the same plain object literal from two different call sites would *not* be treated as equal, but the same JSON string would. This makes the dedup actually fire for the common case (same query, same variables, different call sites).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/shopify/__tests__/storefront-cache.test.ts`
Expected: PASS (1/1)

- [ ] **Step 5: Run the full suite to confirm no regression**

Run: `npx vitest run`
Expected: all existing tests still pass (no behavior change to `storefrontFetch`'s public signature).

- [ ] **Step 6: Verify TypeScript and build**

```bash
npx tsc --noEmit
npm run build
```
Expected: no errors, clean build.

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/storefront.ts lib/shopify/__tests__/storefront-cache.test.ts
git commit -m "perf: memoize storefrontFetch per-request with React cache() to dedupe identical GraphQL calls"
```

---

### Task 3: CLS guardrail tests for the header bars and LCP images

**Files:**
- Test: `__tests__/header-cls.test.ts`
- Test: `__tests__/lcp-priority.test.ts`

The announcement bar and stats bar in `components/layout/Header.tsx` already use fixed Tailwind heights (`h-13.5`, `h-11.5`) so their rotating text/icons can't shift layout — but nothing currently guards against a future edit silently removing that. Lock it in with regression tests, and verify LCP-candidate images (hero, category banner, PDP gallery) use `priority`.

- [ ] **Step 1: Write the header height regression test**

```typescript
// __tests__/header-cls.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(path.resolve(__dirname, '../components/layout/Header.tsx'), 'utf-8')

describe('Header announcement/stats bars reserve fixed height (no CLS on rotation)', () => {
  it('announcement bar has a fixed height class', () => {
    const match = src.match(/Announcement bar[\s\S]{0,200}?className="(bg-navy-900[^"]*)"/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/\bh-\d/)
  })

  it('stats bar has a fixed height class', () => {
    const match = src.match(/Stats bar[\s\S]{0,200}?className="(hidden md:flex[^"]*)"/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/\bh-\d/)
  })
})
```

- [ ] **Step 2: Run it — expect PASS immediately**

Run: `npx vitest run __tests__/header-cls.test.ts`
Expected: PASS (2/2) — this captures the current correct state as a regression guard, since the fix is already in place.

- [ ] **Step 3: Write the LCP priority test**

```typescript
// __tests__/lcp-priority.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('LCP-candidate images use priority loading', () => {
  it('homepage hero product images can be marked priority', () => {
    expect(read('components/home/HeroSection.tsx')).toMatch(/priority/)
  })

  it('PDP main gallery image is priority', () => {
    expect(read('components/product/ProductView.tsx')).toMatch(/priority/)
  })

  it('category hero banner image component is rendered above the fold without lazy', () => {
    const src = read('app/category/[slug]/page.tsx')
    expect(src).not.toMatch(/loading=["']lazy["'][\s\S]{0,80}CategoryImage/)
  })
})
```

- [ ] **Step 4: Run it**

Run: `npx vitest run __tests__/lcp-priority.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add __tests__/header-cls.test.ts __tests__/lcp-priority.test.ts
git commit -m "test: add CLS/LCP regression guards for header bars and above-the-fold images"
```

---

### Task 4: Lighthouse audit script + report for Track A routes

**Files:**
- Create: `scripts/run-lighthouse-audit-track-a.sh`
- Create: `audit/AUDIT-REPORT-TRACK-A.md`

Same shape as the existing `scripts/run-lighthouse-audit.sh` / `audit/AUDIT-REPORT.md` from B6, scoped to the 8 ticket routes that B6 explicitly excluded as "Sardorbek's responsibility."

- [ ] **Step 1: Create `scripts/run-lighthouse-audit-track-a.sh`**

```bash
#!/usr/bin/env bash
# Track A Lighthouse audit — home, category, PDP, OCC, industry, blog, cart, account
# Usage: npm run dev (or npm run build && npm run start) in one terminal, then:
#   ./scripts/run-lighthouse-audit-track-a.sh
# Requires: npx lighthouse available via npm.
#
# NOTE: this runs against localhost. Re-run with BASE=https://<production-candidate>
# pointed at the real production candidate before sign-off — local dev/build numbers
# are directional, not the launch gate.

set -e
OUTDIR="audit/lighthouse-track-a"
mkdir -p "$OUTDIR"
BASE="${BASE:-http://localhost:3000}"

routes=(
  "/:home"
  "/category/gloves:category"
  "/product/nitrile-exam-gloves-powder-free:pdp"
  "/solutions/occ:occ"
  "/industries/pharmacy:industry"
  "/blog/types-of-needles:blog"
  "/cart:cart"
  "/account:account"
)

for entry in "${routes[@]}"; do
  route="${entry%%:*}"
  slug="${entry##*:}"
  echo "Auditing $BASE$route -> $OUTDIR/$slug.json"
  npx lighthouse "$BASE$route" \
    --emulated-form-factor=mobile \
    --throttling-method=simulate \
    --output=json \
    --output-path="$OUTDIR/$slug.json" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet || echo "  WARNING: failed: $route"
done

echo ""
echo "Done. Reports in $OUTDIR/"
echo "Extract one score: node -e \"const r=require('./$OUTDIR/home.json'); console.log(r.categories.performance.score*100, r.audits['largest-contentful-paint'].displayValue, r.audits['cumulative-layout-shift'].displayValue)\""
```

Update the `/category/gloves` and `/product/nitrile-exam-gloves-powder-free` slugs if those handles don't exist in the dev database — confirm against `app/category/[slug]/page.tsx` generateStaticParams or a live collection list before running.

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/run-lighthouse-audit-track-a.sh
```

- [ ] **Step 3: Create `audit/AUDIT-REPORT-TRACK-A.md`**

```markdown
# Track A Performance Audit Report — MD Supplies

**Date:** 2026-06-23
**Status:** Static analysis + local Lighthouse run complete. Production-candidate re-run pending deploy.

## How to complete the launch-gate measurement

1. Deploy the production candidate.
2. Re-run: `BASE=https://<production-candidate-domain> ./scripts/run-lighthouse-audit-track-a.sh`
3. Replace the "Local dev" numbers below with the production-candidate numbers.
4. Do not sign off the ticket's Lighthouse acceptance criterion until this section is filled from the real candidate, not localhost.

## Targets

| Metric | Target |
|---|---|
| LCP (mobile) | <= 2.5s |
| INP | <= 200ms |
| CLS | <= 0.1 |

## Results — Local dev server (`localhost:3000`, `npm run dev`)

| Route | LCP | INP | CLS | Lighthouse (mobile) | Status |
|---|---|---|---|---|---|
| `/` (home) | — | — | — | — | Pending: run script |
| `/category/[slug]` | — | — | — | — | Pending: run script |
| `/product/[slug]` | — | — | — | — | Pending: run script |
| `/solutions/occ` | — | — | — | — | Pending: run script |
| `/industries/[slug]` | — | — | — | — | Pending: run script |
| `/blog/[handle]` | — | — | — | — | Pending: run script |
| `/cart` | — | — | — | — | Pending: run script |
| `/account` | — | — | — | — | Pending: run script |

INP cannot be measured by Lighthouse lab runs (it requires real user interaction); estimate via Total Blocking Time in the same report and confirm with field data (CrUX/PageSpeed Insights) post-launch.

## Results — Production candidate (PENDING)

Fill in once a deployed URL exists. Same table shape as above.

## Known structural fixes already applied (this ticket)

- Homepage ISR gap closed (`app/page.tsx` now `revalidate = 60`).
- `storefrontFetch` memoized per-request via React `cache()` to remove duplicate identical GraphQL calls within a single render.
- Header announcement/stats bars confirmed fixed-height (no CLS contribution), regression-tested.
```

- [ ] **Step 4: Run the script locally and fill in the "Local dev server" table**

```bash
npm run dev &
sleep 5
./scripts/run-lighthouse-audit-track-a.sh
```

Read each JSON in `audit/lighthouse-track-a/` and transcribe `categories.performance.score`, `audits['largest-contentful-paint'].numericValue`, `audits['cumulative-layout-shift'].numericValue`, and `audits['total-blocking-time'].numericValue` (INP proxy) into the report table. Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-lighthouse-audit-track-a.sh audit/AUDIT-REPORT-TRACK-A.md audit/lighthouse-track-a
git commit -m "perf: add Track A Lighthouse audit script + report (local baseline, candidate re-run pending)"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass, including the new ones from Tasks 1–3.

- [ ] **Step 2: Run full build**

```bash
npm run build
```
Expected: clean compile, all routes present.

- [ ] **Step 3: TypeScript strict check**

```bash
npx tsc --noEmit
```
Expected: no output.
