# A4 · Sitemap + Robots + Canonical/Indexation Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a correct `sitemap.xml` and `robots.txt`, fix the canonical/noindex bugs in category pages, strip tracking params from canonicals, and wire `buildMetadata` into every public template so each page emits the right robots + canonical.

**Architecture:** `lib/seo/sitemap.ts` and `lib/seo/robots-config.ts` hold pure functions tested with Vitest. `app/sitemap.ts` and `app/robots.ts` are thin Next.js route handlers that import those functions. `MetadataInput` gains a `canonical?: string` override field so category pages can explicitly set the canonical for filtered/sorted variants. All templates call `buildMetadata` (or the lib's individual helpers) so robots and canonical are always authoritative.

**Tech Stack:** Next.js 16 (`MetadataRoute.Sitemap`, `MetadataRoute.Robots` conventions), Vitest 4, TypeScript strict mode.

---

## Background: current bugs to fix

1. **`app/category/[slug]/page.tsx`** and **`app/category/[slug]/[sub]/page.tsx`** call `buildMetadata` with `canonical: '...'` and `noindex: true`. Neither property exists on `MetadataInput`, so both are silently discarded at runtime. Filtered/sorted category pages are currently indexed with a wrong canonical.

2. **`buildCanonical` self strategy** does not strip UTM/tracking params (`utm_*`, `gclid`, `msclkid`). If a path containing these params is passed in, they leak into the canonical tag.

3. **No `app/sitemap.ts` or `app/robots.ts`** exist yet.

4. **Several public templates** use raw `export const metadata = { ... }` without robots or canonical, so they have no canonical tag in `<head>`.

---

## File map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/seo/types.ts` | Add `canonical?: string` to `MetadataInput` |
| Modify | `lib/seo/metadata.ts` | Use `input.canonical` override when provided |
| Modify | `lib/seo/canonical.ts` | Strip tracking params in `self` strategy |
| Modify | `lib/seo/__tests__/canonical.test.ts` | New UTM-stripping tests |
| Modify | `lib/seo/__tests__/metadata.test.ts` | New canonical-override tests |
| Modify | `app/category/[slug]/page.tsx` | Fix `noindex` → `noIndex` |
| Modify | `app/category/[slug]/[sub]/page.tsx` | Fix `noindex` → `noIndex` |
| Create | `lib/seo/robots-config.ts` | Pure `getRobotsConfig()` function |
| Create | `lib/seo/__tests__/robots-config.test.ts` | Tests for robots config logic |
| Create | `app/robots.ts` | Next.js robots route (thin wrapper) |
| Create | `lib/seo/sitemap.ts` | Pure `getSitemapUrls()` function |
| Create | `lib/seo/__tests__/sitemap.test.ts` | Tests for sitemap URL list |
| Create | `app/sitemap.ts` | Next.js sitemap route (thin wrapper) |
| Modify | `app/page.tsx` | Add `buildMetadata` metadata export |
| Modify | `app/categories/page.tsx` | Replace raw metadata with `buildMetadata` |
| Modify | `app/partners/page.tsx` | Replace raw metadata with `buildMetadata` |
| Modify | `app/blog/page.tsx` | Replace raw metadata with `buildMetadata` |
| Modify | `app/solutions/occ/page.tsx` | Replace raw metadata with `buildMetadata` |
| Modify | `app/search/page.tsx` | Add noindex metadata via `buildMetadata` |
| Modify | `app/industries/page.tsx` | Add robots + canonical via lib helpers |
| Modify | `app/about/page.tsx` | Add robots + canonical via lib helpers |
| Modify | `app/contact/page.tsx` | Add robots + canonical via lib helpers |
| Modify | `app/faq/page.tsx` | Add robots + canonical via lib helpers |
| Modify | `app/returns/page.tsx` | Add robots + canonical via lib helpers |
| Modify | `app/industries/[slug]/page.tsx` | Use `buildMetadata` in `generateMetadata` |
| Modify | `app/partners/[slug]/page.tsx` | Use `buildMetadata` in `generateMetadata` |
| Modify | `app/product/[slug]/page.tsx` | Use `buildMetadata` in `generateMetadata` |

---

## Task 1: Fix `MetadataInput` canonical override + category page noindex bugs

### Files
- Modify: `lib/seo/types.ts`
- Modify: `lib/seo/metadata.ts`
- Modify: `lib/seo/__tests__/metadata.test.ts`
- Modify: `app/category/[slug]/page.tsx`
- Modify: `app/category/[slug]/[sub]/page.tsx`

- [ ] **Step 1: Add failing test for canonical override**

Append to `lib/seo/__tests__/metadata.test.ts` (inside a new describe block at the bottom):

```typescript
describe('buildMetadata — explicit canonical override', () => {
  it('uses canonical override instead of slug-derived path', () => {
    const m = buildMetadata({
      pageType: 'category',
      title: 'Exam Gloves',
      slug: 'exam-gloves',
      canonical: `${BASE}/category/exam-gloves`,
    })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/category/exam-gloves`)
  })

  it('override canonical is used even when slug differs', () => {
    const m = buildMetadata({
      pageType: 'category',
      title: 'Gloves',
      slug: 'other',
      canonical: `${BASE}/category/gloves`,
    })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/category/gloves`)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run lib/seo/__tests__/metadata.test.ts
```

Expected: FAIL — `buildMetadata` receives `canonical` but it is discarded (unknown property).

- [ ] **Step 3: Add `canonical` field to `MetadataInput` in `lib/seo/types.ts`**

Current `MetadataInput` ends at `noIndex?: boolean`. Add one field:

```typescript
export interface MetadataInput {
  pageType: PageType
  title?: string
  description?: string
  slug?: string
  parentSlug?: string
  image?: string
  noIndex?: boolean
  /** Explicit canonical URL override — bypasses the slug-derived canonical. */
  canonical?: string
}
```

- [ ] **Step 4: Use the override in `lib/seo/metadata.ts`**

In `buildMetadata`, replace the line:

```typescript
const canonical = buildCanonical({ path, strategy: 'self' })
```

with:

```typescript
const canonical = input.canonical ?? buildCanonical({ path, strategy: 'self' })
```

- [ ] **Step 5: Run tests to confirm they pass**

```
npx vitest run lib/seo/__tests__/metadata.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Fix `noindex` → `noIndex` in `app/category/[slug]/page.tsx`**

There are two calls to `buildMetadata` that pass `noindex: true` (lowercase). Change both:

First call (filtered page, around line 77–84):
```typescript
    if (isFiltered) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}`,
        noIndex: true,
      })
    }
```

Second call (paginated, around line 87–96): the paginated case does NOT need `noIndex` (paginated clean pages are indexed). Leave that call as-is but ensure there is no lowercase `noindex`. The call currently looks like:
```typescript
    if (currentPage > 1) {
      return buildMetadata({
        pageType: 'category',
        title,
        description: description || undefined,
        canonical: sp.after
          ? `${base}/category/${slug}?page=${currentPage}&after=${sp.after}`
          : `${base}/category/${slug}`,
      })
    }
```
No change needed there (no noindex present on pagination path).

Third call (clean page 1, around line 98–103): no `noindex` present, leave as-is.

- [ ] **Step 7: Fix `noindex` → `noIndex` in `app/category/[slug]/[sub]/page.tsx`**

Same pattern — one filtered call passes `noindex: true`. Change it:

```typescript
    if (isFiltered) {
      return buildMetadata({
        pageType: 'subcategory',
        title,
        description: description || undefined,
        canonical: `${base}/category/${slug}/${sub}`,
        noIndex: true,
      })
    }
```

The other two calls (`currentPage > 1` and clean page 1) have no `noindex` — leave them as-is.

- [ ] **Step 8: Run full test suite**

```
npx vitest run
```

Expected: all PASS (no regressions).

- [ ] **Step 9: Commit**

```
git add lib/seo/types.ts lib/seo/metadata.ts lib/seo/__tests__/metadata.test.ts \
        "app/category/[slug]/page.tsx" "app/category/[slug]/[sub]/page.tsx"
git commit -m "fix(seo): add canonical override to MetadataInput, fix category noIndex casing"
```

---

## Task 2: Strip UTM / tracking params from `buildCanonical`

### Files
- Modify: `lib/seo/canonical.ts`
- Modify: `lib/seo/__tests__/canonical.test.ts`

- [ ] **Step 1: Add failing tests for UTM stripping**

Append to `lib/seo/__tests__/canonical.test.ts`:

```typescript
describe('self — tracking param stripping', () => {
  it('strips utm_source', () => {
    expect(buildCanonical({ path: '/category/gloves?utm_source=google' })).toBe(`${BASE}/category/gloves`)
  })

  it('strips utm_medium and utm_campaign together', () => {
    expect(
      buildCanonical({ path: '/category/gloves?utm_medium=cpc&utm_campaign=summer' }),
    ).toBe(`${BASE}/category/gloves`)
  })

  it('strips gclid', () => {
    expect(buildCanonical({ path: '/category/gloves?gclid=Cj0KCQjw' })).toBe(`${BASE}/category/gloves`)
  })

  it('strips msclkid', () => {
    expect(buildCanonical({ path: '/product/glove?msclkid=abc123' })).toBe(`${BASE}/product/glove`)
  })

  it('preserves non-tracking params (page cursor)', () => {
    expect(
      buildCanonical({ path: '/category/gloves?page=2&after=cursor123' }),
    ).toBe(`${BASE}/category/gloves?page=2&after=cursor123`)
  })

  it('strips tracking params but preserves legitimate params', () => {
    expect(
      buildCanonical({ path: '/category/gloves?page=2&utm_source=email&after=abc' }),
    ).toBe(`${BASE}/category/gloves?page=2&after=abc`)
  })

  it('parent-unfiltered strategy already strips all params (no double-strip issue)', () => {
    expect(
      buildCanonical({ path: '/category/gloves?utm_source=google', strategy: 'parent-unfiltered' }),
    ).toBe(`${BASE}/category/gloves`)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run lib/seo/__tests__/canonical.test.ts
```

Expected: all new tests FAIL.

- [ ] **Step 3: Add `stripTrackingParams` helper + update `buildCanonical`**

Replace the entire `lib/seo/canonical.ts` with:

```typescript
import { SITE_URL } from './constants'
import type { CanonicalInput } from './types'

const TRACKING_PARAMS = new Set(['gclid', 'msclkid'])

function stripTrackingParams(path: string): string {
  const qIdx = path.indexOf('?')
  if (qIdx === -1) return path
  const base = path.slice(0, qIdx)
  const params = new URLSearchParams(path.slice(qIdx + 1))
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key) || key.startsWith('utm_')) {
      params.delete(key)
    }
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * Generates the canonical URL for a page.
 *
 * - `'self'` (default) — canonical points to the page itself, tracking params stripped.
 * - `'parent-unfiltered'` — strips query string / uses `basePath`; for paginated
 *   or filtered pages that should canonical to the unfiltered parent.
 * - `'base-product'` — variant URLs canonical to the base product URL via `basePath`.
 */
export function buildCanonical(input: CanonicalInput): string {
  const { path, strategy = 'self', basePath } = input

  switch (strategy) {
    case 'self':
      return `${SITE_URL}${stripTrackingParams(path)}`
    case 'parent-unfiltered':
      return `${SITE_URL}${basePath ?? path.split('?')[0]}`
    case 'base-product':
      return `${SITE_URL}${basePath ?? path}`
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run lib/seo/__tests__/canonical.test.ts
```

Expected: all PASS (new tests + existing tests).

- [ ] **Step 5: Run full test suite**

```
npx vitest run
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```
git add lib/seo/canonical.ts lib/seo/__tests__/canonical.test.ts
git commit -m "feat(seo): strip UTM/gclid/msclkid from canonical self-strategy"
```

---

## Task 3: Create `lib/seo/robots-config.ts` + `app/robots.ts`

### Files
- Create: `lib/seo/robots-config.ts`
- Create: `lib/seo/__tests__/robots-config.test.ts`
- Create: `app/robots.ts`

- [ ] **Step 1: Write tests for `getRobotsConfig`**

Create `lib/seo/__tests__/robots-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getRobotsConfig } from '../robots-config'

describe('getRobotsConfig', () => {
  it('disallows all crawlers on staging', () => {
    const cfg = getRobotsConfig(true)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    expect(rules.disallow).toBe('/')
    expect(rules.allow).toBeUndefined()
  })

  it('does not include sitemap on staging', () => {
    const cfg = getRobotsConfig(true)
    expect(cfg.sitemap).toBeUndefined()
  })

  it('allows root on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    expect(rules.allow).toBe('/')
  })

  it('disallows /api/ on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/api/')
  })

  it('disallows /account/ on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/account/')
  })

  it('disallows /cart on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/cart')
  })

  it('disallows /search on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/search')
  })

  it('disallows /internal/ on production', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]
    expect(disallowed).toContain('/internal/')
  })

  it('includes sitemap URL on production', () => {
    const cfg = getRobotsConfig(false)
    const sitemap = Array.isArray(cfg.sitemap) ? cfg.sitemap[0] : cfg.sitemap
    expect(sitemap).toBeDefined()
    expect(sitemap).toMatch(/\/sitemap\.xml$/)
  })

  it('does not block CSS, JS, or images', () => {
    const cfg = getRobotsConfig(false)
    const rules = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow ?? '']
    for (const path of disallowed) {
      expect(path).not.toMatch(/\.(css|js|png|jpg|svg|woff2?)/)
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run lib/seo/__tests__/robots-config.test.ts
```

Expected: FAIL — `robots-config` module does not exist.

- [ ] **Step 3: Create `lib/seo/robots-config.ts`**

```typescript
import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'

export function getRobotsConfig(isStaging: boolean = STAGING_GUARD): MetadataRoute.Robots {
  if (isStaging) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account/', '/cart', '/search', '/internal/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run lib/seo/__tests__/robots-config.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Create `app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next'
import { getRobotsConfig } from '@/lib/seo/robots-config'

export default function robots(): MetadataRoute.Robots {
  return getRobotsConfig()
}
```

- [ ] **Step 6: Run full test suite**

```
npx vitest run
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```
git add lib/seo/robots-config.ts lib/seo/__tests__/robots-config.test.ts app/robots.ts
git commit -m "feat(a4): add robots.txt route — disallow api/account/cart/search/internal, staging guard"
```

---

## Task 4: Create `lib/seo/sitemap.ts` + `app/sitemap.ts`

### Files
- Create: `lib/seo/sitemap.ts`
- Create: `lib/seo/__tests__/sitemap.test.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: Write tests for `getSitemapUrls`**

Create `lib/seo/__tests__/sitemap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getSitemapUrls } from '../sitemap'

const EXCLUDED_PATHS = ['/search', '/cart', '/account', '/internal', '/api']

describe('getSitemapUrls', () => {
  it('returns an empty array on staging', () => {
    expect(getSitemapUrls(true)).toHaveLength(0)
  })

  it('returns non-empty array on production', () => {
    expect(getSitemapUrls(false).length).toBeGreaterThan(0)
  })

  it('includes homepage', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u === 'https://mdsupplies.com/')).toBe(true)
  })

  it('includes /categories', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/categories'))).toBe(true)
  })

  it('includes /industries', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/industries'))).toBe(true)
  })

  it('includes /partners', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/partners'))).toBe(true)
  })

  it('includes /blog', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/blog'))).toBe(true)
  })

  it('never includes excluded paths', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    for (const excluded of EXCLUDED_PATHS) {
      const match = urls.find((u) => {
        try { return new URL(u).pathname === excluded || new URL(u).pathname.startsWith(excluded) }
        catch { return false }
      })
      expect(match, `Sitemap must not contain ${excluded}`).toBeUndefined()
    }
  })

  it('all URLs use production SITE_URL (https://mdsupplies.com)', () => {
    const urls = getSitemapUrls(false).map((e) => e.url)
    for (const url of urls) {
      expect(url.startsWith('https://mdsupplies.com'), `URL must start with site URL: ${url}`).toBe(true)
    }
  })

  it('homepage priority is 1', () => {
    const entry = getSitemapUrls(false).find((e) => e.url === 'https://mdsupplies.com/')
    expect(entry?.priority).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run lib/seo/__tests__/sitemap.test.ts
```

Expected: FAIL — `sitemap` module does not exist.

- [ ] **Step 3: Create `lib/seo/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next'
import { SITE_URL } from './constants'
import { STAGING_GUARD } from './robots'

type SitemapEntry = MetadataRoute.Sitemap[number]

const STATIC_URLS: SitemapEntry[] = [
  { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.9 },
  { url: `${SITE_URL}/industries`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/partners`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/solutions/occ`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${SITE_URL}/brands`, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/returns`, changeFrequency: 'monthly', priority: 0.4 },
]

/**
 * Returns the full sitemap URL list.
 *
 * - Staging: always returns empty (prevents staging URLs from being indexed).
 * - Production: static pages only for now.
 *
 * Dynamic entries (categories, subcategories, products, partners, industry
 * detail pages, blog articles) will be appended here once the Shopify data
 * feed is connected (A4 data phase).
 */
export function getSitemapUrls(isStaging: boolean = STAGING_GUARD): MetadataRoute.Sitemap {
  if (isStaging) return []
  return [...STATIC_URLS]
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run lib/seo/__tests__/sitemap.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Create `app/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next'
import { getSitemapUrls } from '@/lib/seo/sitemap'

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapUrls()
}
```

- [ ] **Step 6: Run full test suite**

```
npx vitest run
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```
git add lib/seo/sitemap.ts lib/seo/__tests__/sitemap.test.ts app/sitemap.ts
git commit -m "feat(a4): add sitemap.xml route — static pages, staging guard, ready for dynamic feed"
```

---

## Task 5: Wire `buildMetadata` into all page templates

### Files (Group A — static pages, replace raw metadata export)
- Modify: `app/page.tsx`
- Modify: `app/categories/page.tsx`
- Modify: `app/partners/page.tsx`
- Modify: `app/blog/page.tsx`
- Modify: `app/solutions/occ/page.tsx`
- Modify: `app/search/page.tsx`

### Files (Group B — public support pages, add canonical + robots manually)
- Modify: `app/industries/page.tsx`
- Modify: `app/about/page.tsx`
- Modify: `app/contact/page.tsx`
- Modify: `app/faq/page.tsx`
- Modify: `app/returns/page.tsx`

### Files (Group C — dynamic pages, update generateMetadata)
- Modify: `app/industries/[slug]/page.tsx`
- Modify: `app/partners/[slug]/page.tsx`
- Modify: `app/product/[slug]/page.tsx`

> Note: `app/industries/page.tsx` and support pages (Group B) cannot use `buildMetadata` directly because there is no `industries-hub` PageType and using `utility` would set `noindex,follow` (wrong for public pages). Instead they use `buildCanonical` directly with an explicit `robots: 'index,follow'` field.

---

### Group A — static pages

- [ ] **Step 1: Update `app/page.tsx`**

`app/page.tsx` currently has no `metadata` export at all. Add these two lines near the top (after the last import and before the `export default async function Home`):

```typescript
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({ pageType: 'homepage' })
```

The full updated imports section will look like:
```typescript
import { HeroSection }       from "@/components/home/HeroSection";
import { TrustedBrands }     from "@/components/home/TrustedBrands";
import { ShopByIndustry }    from "@/components/home/ShopByIndustry";
import { PopularCategories } from "@/components/home/PopularCategories";
import { PopularProducts }   from "@/components/home/PopularProducts";
import { WhyChooseUs }       from "@/components/home/WhyChooseUs";
import { WholesalePricing }  from "@/components/home/WholesalePricing";
import { storefrontFetch } from '@/lib/shopify/storefront';
import { GET_PRODUCTS } from '@/lib/shopify/queries/products';
import { GET_COLLECTIONS } from '@/lib/shopify/queries/collections';
import type { CollectionProduct } from '@/lib/shopify/types';
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({ pageType: 'homepage' })
```

- [ ] **Step 2: Update `app/categories/page.tsx`**

Remove:
```typescript
import type { Metadata } from 'next'
```

Replace:
```typescript
export const metadata: Metadata = {
  title: 'All Medical Supply Categories | MD Supplies',
  description: 'Browse all medical supply categories at wholesale prices — gloves, wound care, needles, IV therapy, and more. Serving clinics, urgent care, and B2B buyers.',
}
```

With:
```typescript
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  pageType: 'categories-hub',
  description: 'Browse all medical supply categories at wholesale prices — gloves, wound care, needles, IV therapy, and more. Serving clinics, urgent care, and B2B buyers.',
})
```

Place the `buildMetadata` import near the top with the other imports. Remove the now-unused `import type { Metadata } from 'next'`.

- [ ] **Step 3: Update `app/partners/page.tsx`**

Remove:
```typescript
import type { Metadata } from 'next'
```

Replace:
```typescript
export const metadata: Metadata = {
  title: 'Partners | MD Supplies',
  description: 'Our network of trusted medical supply manufacturers and partners.',
}
```

With:
```typescript
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  pageType: 'partners',
  description: 'Our network of trusted medical supply manufacturers and partners.',
})
```

- [ ] **Step 4: Update `app/blog/page.tsx`**

Remove `import type { Metadata } from "next"`.

Replace:
```typescript
export const metadata: Metadata = {
  title: "Blog | MD Supplies",
  description:
    "Tips, guides, and industry updates for healthcare professionals and facility managers.",
};
```

With:
```typescript
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  pageType: 'blog-hub',
  description: 'Tips, guides, and industry updates for healthcare professionals and facility managers.',
})
```

- [ ] **Step 5: Update `app/solutions/occ/page.tsx`**

The current file has:
```typescript
export const metadata: Metadata = {
  title: 'OCC Solutions | MD Supplies',
  description: '...',
}
```

Replace (keeping the existing description if it has one):
```typescript
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({ pageType: 'occ' })
```

If the OCC page has a custom description worth keeping, pass it: `buildMetadata({ pageType: 'occ', description: '...' })`. Check the current description in the file and decide.

- [ ] **Step 6: Update `app/search/page.tsx`**

Add after the existing imports:
```typescript
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({ pageType: 'utility', title: 'Search', slug: 'search' })
```

Remove the now-unused `import type { Metadata } from 'next'` if it was present but unused.

---

### Group B — public support pages (explicit canonical + robots)

> These pages need `index,follow` + canonical, but no existing `PageType` fits. We call `buildCanonical` directly.

- [ ] **Step 7: Update `app/industries/page.tsx`**

Change the import block to add `buildCanonical`:
```typescript
import { buildCanonical } from '@/lib/seo'
```

Replace the metadata export:
```typescript
export const metadata: Metadata = {
  title: 'Shop by Industry | MD Supplies',
  description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
}
```

With (no longer needs `Metadata` type annotation — TypeScript infers it):
```typescript
export const metadata = {
  title: 'Shop by Industry | MDSupplies',
  description: 'Medical supplies curated for your specialty — urgent care, EMS, pharmacy, physical therapy, and more.',
  robots: 'index,follow',
  alternates: { canonical: buildCanonical({ path: '/industries' }) },
}
```

Remove `import type { Metadata } from 'next'` if it becomes unused.

- [ ] **Step 8: Update `app/about/page.tsx`**

Add import:
```typescript
import { buildCanonical } from '@/lib/seo'
```

Replace:
```typescript
export const metadata: Metadata = {
  title: "About Us | MD Supplies",
  description:
    "MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with wholesale pricing, same-day shipping, and trusted brands.",
};
```

With:
```typescript
export const metadata = {
  title: 'About Us | MDSupplies',
  description: 'MDSupplies serves clinics, urgent care centers, HRT practices, and first responders with wholesale pricing, same-day shipping, and trusted brands.',
  robots: 'index,follow',
  alternates: { canonical: buildCanonical({ path: '/about' }) },
}
```

Remove `import type { Metadata } from "next"` if unused.

- [ ] **Step 9: Update `app/contact/page.tsx`**

Add import:
```typescript
import { buildCanonical } from '@/lib/seo'
```

Replace:
```typescript
export const metadata: Metadata = {
  title: 'Contact Us | MD Supplies',
  description: 'Get in touch with the MD Supplies team for wholesale inquiries.',
}
```

With:
```typescript
export const metadata = {
  title: 'Contact Us | MDSupplies',
  description: 'Get in touch with the MD Supplies team for wholesale inquiries.',
  robots: 'index,follow',
  alternates: { canonical: buildCanonical({ path: '/contact' }) },
}
```

Remove `import type { Metadata } from 'next'` if unused.

- [ ] **Step 10: Update `app/faq/page.tsx`**

Add import:
```typescript
import { buildCanonical } from '@/lib/seo'
```

Replace:
```typescript
export const metadata: Metadata = {
  title: "FAQ | MD Supplies",
  description:
    "Frequently asked questions about MD Supplies — shipping, returns, product authenticity, and wholesale pricing.",
};
```

With:
```typescript
export const metadata = {
  title: 'FAQ | MDSupplies',
  description: 'Frequently asked questions about MD Supplies — shipping, returns, product authenticity, and wholesale pricing.',
  robots: 'index,follow',
  alternates: { canonical: buildCanonical({ path: '/faq' }) },
}
```

Remove `import type { Metadata } from "next"` if unused.

- [ ] **Step 11: Update `app/returns/page.tsx`**

Add import:
```typescript
import { buildCanonical } from '@/lib/seo'
```

Replace:
```typescript
export const metadata: Metadata = {
  title: 'Returns | MD Supplies',
  description: 'MD Supplies return policy and return request instructions.',
}
```

With:
```typescript
export const metadata = {
  title: 'Returns | MDSupplies',
  description: 'MD Supplies return policy and return request instructions.',
  robots: 'index,follow',
  alternates: { canonical: buildCanonical({ path: '/returns' }) },
}
```

Remove `import type { Metadata } from 'next'` if unused.

---

### Group C — dynamic pages (update generateMetadata)

- [ ] **Step 12: Update `app/industries/[slug]/page.tsx`**

Add `buildMetadata` to the imports. The current import line for Metadata is:
```typescript
import type { Metadata } from 'next'
```

Add after it (or replace if Metadata is only used in generateMetadata return type):
```typescript
import { buildMetadata } from '@/lib/seo'
```

Replace the `generateMetadata` function:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const industry = INDUSTRIES.find((i) => i.slug === slug)
  if (!industry) return { title: 'Industry | MD Supplies' }
  return {
    title: `${industry.name} Supplies | MD Supplies`,
    description: industry.description,
  }
}
```

With:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const industry = INDUSTRIES.find((i) => i.slug === slug)
  if (!industry) return { title: 'Industry | MDSupplies' }
  return buildMetadata({
    pageType: 'industry',
    title: industry.name,
    description: industry.description,
    slug,
  })
}
```

- [ ] **Step 13: Update `app/partners/[slug]/page.tsx`**

Add `buildMetadata` to imports:
```typescript
import { buildMetadata } from '@/lib/seo'
```

Replace:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `${slug} | Partners | MD Supplies`,
  }
}
```

With:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return buildMetadata({ pageType: 'partner-detail', slug })
}
```

- [ ] **Step 14: Update `app/product/[slug]/page.tsx`**

Add `buildMetadata` to the imports:
```typescript
import { buildMetadata } from '@/lib/seo'
```

The current `generateMetadata` builds raw metadata. Replace:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await storefrontFetch<{ product: RawProduct | null }>(GET_PRODUCT, { handle: slug })
    if (!data.product) return { title: 'Product | MD Supplies' }
    const product = normalizeProduct(data.product)
    const brand = product.brandName ?? product.vendor
    return {
      title: `${product.title} | MD Supplies`,
      description: `${brand} — ${product.description.slice(0, 155)}`,
    }
  } catch {
    return { title: 'Product | MD Supplies' }
  }
}
```

With:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const data = await storefrontFetch<{ product: RawProduct | null }>(GET_PRODUCT, { handle: slug })
    if (!data.product) return { title: 'Product | MDSupplies' }
    const product = normalizeProduct(data.product)
    const brand = product.brandName ?? product.vendor
    return buildMetadata({
      pageType: 'product',
      title: product.title,
      description: `${brand} — ${product.description.slice(0, 155)}`,
      slug,
      image: product.images.nodes[0]?.url,
    })
  } catch {
    return { title: 'Product | MDSupplies' }
  }
}
```

---

### Final verification

- [ ] **Step 15: Run full test suite**

```
npx vitest run
```

Expected: all PASS.

- [ ] **Step 16: TypeScript check**

```
npx tsc --noEmit 2>&1 | grep -v "\.next/"
```

Expected: no errors in project source files.

- [ ] **Step 17: Commit**

```
git add app/page.tsx app/categories/page.tsx app/partners/page.tsx \
        app/blog/page.tsx "app/solutions/occ/page.tsx" app/search/page.tsx \
        app/industries/page.tsx app/about/page.tsx app/contact/page.tsx \
        app/faq/page.tsx app/returns/page.tsx \
        "app/industries/[slug]/page.tsx" "app/partners/[slug]/page.tsx" \
        "app/product/[slug]/page.tsx"
git commit -m "feat(a4): wire buildMetadata into all page templates — robots + canonical on every route"
```

---

## Acceptance criteria verification

After all tasks complete, confirm:

- [ ] `GET /sitemap.xml` returns valid XML with homepage, /categories, /industries, /partners, /blog, /solutions/occ, /brands, /about, /contact, /faq, /returns — and no /search, /cart, /account paths.
- [ ] `GET /robots.txt` disallows `/api/`, `/account/`, `/cart`, `/search`, `/internal/` and includes a `Sitemap:` directive.
- [ ] On staging (`NEXT_PUBLIC_IS_STAGING=true`), `GET /sitemap.xml` returns an empty sitemap, `GET /robots.txt` disallows `*`.
- [ ] Filtered category pages (`/category/gloves?filter=...`) emit `robots: noindex,follow` and canonical pointing to `/category/gloves`.
- [ ] Clean category page 1 emits `robots: index,follow` and canonical pointing to `/category/gloves`.
- [ ] Homepage `<head>` contains `<link rel="canonical" href="https://mdsupplies.com/">`.
- [ ] All tests pass: `npx vitest run`.
