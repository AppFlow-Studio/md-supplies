# Post-Import Runbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run five audit scripts covering collection/category correctness, URL health, sitemap, SEO metadata, and security headers; produce one manual QA checklist; write all results to `audit/`.

**Architecture:** One script per concern (Option B). Each script reads from `.env.local` + Shopify Storefront API (via the existing `storefrontFetch`), hits `localhost:3000`, and writes a markdown report to `audit/`. A shell runner sequences all five. Manual items (GTM, Merchant Center, sign-off) live in a structured checklist doc. No new production code — these are one-shot audit runners.

**Tech Stack:** TypeScript via `npx tsx`, Node.js `fetch`, `jsdom` (already a devDependency), existing `storefrontFetch` from `lib/shopify/storefront.ts`, existing `getAllowedHandles`/`ROADMAP_CATEGORIES` from `lib/category-nav.ts`.

## Global Constraints

- All scripts run with `npx tsx <script>` from the repo root.
- `localhost:3000` must be running (`npm run dev`) before executing any HTTP-check script (Tracks 2–5).
- `.env.local` must contain `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN` for Tracks 1–3 + SEO.
- Base URL is `process.env.SITE_URL ?? 'http://localhost:3000'` throughout.
- All scripts: catch per-URL errors, mark as `ERROR`, continue. Exit code 1 on hard failures; 0 on all-pass.
- No new tests (these are audit scripts, not production code). Existing `npx vitest run` must still pass after Task 2.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/shopify/queries/collections.ts` | Modify | Add `GET_COLLECTION_PRODUCT_HANDLES` query |
| `scripts/audit-collections.ts` | Run (no changes) | Re-generate §5.5 mismatch report post-import |
| `scripts/check-url-health.ts` | Create | L1/L2 200s + 100-PDP stratified sample |
| `scripts/check-sitemap.ts` | Create | Sitemap URL-by-URL + redirect/410 spot-checks |
| `scripts/check-seo-metadata.ts` | Create | Canonical, robots, OG, JSON-LD, internal links |
| `scripts/check-security-headers.ts` | Create | HTTP headers + next.config.ts source check + rollback note |
| `scripts/run-post-import-runbook.sh` | Create | Shell runner that sequences all five scripts |
| `docs/post-import-qa-checklist.md` | Create | Manual checklist: GTM, Merchant Center, sign-off |
| `audit/category-nav-audit-report.md` | Generated | Track 1 output (regenerated) |
| `audit/URL-HEALTH-REPORT.md` | Generated | Track 2 output |
| `audit/SITEMAP-REPORT.md` | Generated | Track 3 output |
| `audit/SEO-METADATA-REPORT.md` | Generated | Track 4 output |
| `audit/SECURITY-REPORT.md` | Generated | Track 5 output |

---

### Task 1: Re-run Collection Audit (E4 / Track 1)

**Files:**
- Run: `scripts/audit-collections.ts` (no changes to the file)
- Output: `audit/category-nav-audit-report.md`

**Interfaces:**
- Produces: `audit/category-nav-audit-report.md` — 11-section §5.5 mismatch report used to verify surface consistency.

- [ ] **Step 1: Run the existing audit script**

```bash
npx tsx scripts/audit-collections.ts
```

Expected output: the 11-section report prints to stdout and is written to `audit/category-nav-audit-report.md`. No errors.

- [ ] **Step 2: Read the regenerated report**

Open `audit/category-nav-audit-report.md`. Check:

1. **§1 Roadmap Coverage** — Are the 8 previously-unmapped categories (Needles & Syringes, Surgical Sutures, Respiratory, Disinfectants, IV Therapy, Urology & Ostomy, Sterilization, Pharmacy Products) still showing `unmapped`? If they now show `mapped`, the import added those collections — §11 should clear.
2. **§9 Orphan Handles** — Should show `_No orphan handles found._`. If any handles appear, flag them for the catalog team.
3. **§10 Surface Delta** — Should show `_All hub handles also appear in nav_` or only expected synthesized sub-collections.
4. **§11 Action Items** — If any roadmap categories still have empty `matchedHandles`, they appear here. Document them in the checklist.

- [ ] **Step 3: Commit the regenerated report**

```bash
git add audit/category-nav-audit-report.md
git commit -m "audit: regenerate §5.5 collection mismatch report post-import"
```

---

### Task 2: Add `GET_COLLECTION_PRODUCT_HANDLES` query

**Files:**
- Modify: `lib/shopify/queries/collections.ts`

**Interfaces:**
- Produces: `GET_COLLECTION_PRODUCT_HANDLES` — used by `scripts/check-url-health.ts` and `scripts/check-seo-metadata.ts` to fetch product handles for a given collection handle.

- [ ] **Step 1: Open `lib/shopify/queries/collections.ts` and append the new query**

Add at the end of the file:

```typescript
export const GET_COLLECTION_PRODUCT_HANDLES = `#graphql
  query GetCollectionProductHandles($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first) {
        nodes {
          handle
        }
      }
    }
  }
`
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep error | head -10
```

Expected: zero errors.

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: same pass count as before.

- [ ] **Step 4: Commit**

```bash
git add lib/shopify/queries/collections.ts
git commit -m "feat: add GET_COLLECTION_PRODUCT_HANDLES query for audit scripts"
```

---

### Task 3: Build and run `scripts/check-url-health.ts` (Track 2)

**Files:**
- Create: `scripts/check-url-health.ts`
- Output: `audit/URL-HEALTH-REPORT.md`

**Interfaces:**
- Consumes: `getAllowedHandles()` from `lib/category-nav.ts`, `ROADMAP_CATEGORIES` from `lib/category-nav.ts`, `storefrontFetch` from `lib/shopify/storefront.ts`, `GET_COLLECTION_PRODUCT_HANDLES` from Task 2.
- Produces: `audit/URL-HEALTH-REPORT.md` — §1 category URL table, §2 PDP sample table with pass/fail per row.

- [ ] **Step 1: Create `scripts/check-url-health.ts`**

```typescript
import { writeFileSync } from 'fs'
import { loadEnvConfig } from '@next/env'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTION_PRODUCT_HANDLES } from '../lib/shopify/queries/collections'
import { getAllowedHandles, ROADMAP_CATEGORIES } from '../lib/category-nav'

loadEnvConfig(process.cwd())

const BASE_URL = process.env.SITE_URL ?? 'http://localhost:3000'

type Row = { url: string; status: number | string; pass: boolean; note: string }

async function checkUrl(url: string): Promise<{ status: number | string; ok: boolean }> {
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
    return { status: res.status, ok: res.status === 200 }
  } catch (e) {
    return { status: `ERROR: ${(e as Error).message}`, ok: false }
  }
}

async function main() {
  const lines: string[] = []
  lines.push('# URL Health Report')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Base URL: ${BASE_URL}`)
  lines.push('')

  // ── §1 L1/L2 Category URLs ─────────────────────────────────────────────────
  const allowed = getAllowedHandles()
  const categoryRows: Row[] = []
  for (const handle of allowed) {
    const url = `${BASE_URL}/category/${handle}`
    const { status, ok } = await checkUrl(url)
    categoryRows.push({ url, status, pass: ok, note: ok ? '' : 'Non-200 response' })
  }

  const catPass = categoryRows.filter((r) => r.pass).length
  const catFail = categoryRows.filter((r) => !r.pass).length
  lines.push(`## §1 L1/L2 Category URLs — ${catPass} pass / ${catFail} fail`)
  lines.push('')
  lines.push('| URL | Status | Result |')
  lines.push('|-----|--------|--------|')
  for (const r of categoryRows) {
    lines.push(`| ${r.url} | ${r.status} | ${r.pass ? '✅ PASS' : `❌ FAIL — ${r.note}`} |`)
  }
  lines.push('')

  // ── §2 PDP Stratified Sample (§17.3) ──────────────────────────────────────
  const allHandles: string[] = []
  for (const cat of ROADMAP_CATEGORIES) {
    for (const collHandle of cat.matchedHandles) {
      try {
        const data = await storefrontFetch<{
          collection: { products: { nodes: { handle: string }[] } } | null
        }>(GET_COLLECTION_PRODUCT_HANDLES, { handle: collHandle, first: 10 })
        if (data.collection?.products.nodes) {
          allHandles.push(...data.collection.products.nodes.map((p) => p.handle))
        }
      } catch {
        // collection not yet in Shopify — skip
      }
    }
  }

  const unique = [...new Set(allHandles)]
  const sample =
    unique.length > 100
      ? unique.filter((_, i) => i % Math.ceil(unique.length / 100) === 0).slice(0, 100)
      : unique

  const pdpRows: (Row & { hasTitle: boolean; hasDesc: boolean })[] = []
  for (const handle of sample) {
    const url = `${BASE_URL}/shop/${handle}`
    const { status, ok } = await checkUrl(url)
    let hasTitle = false
    let hasDesc = false
    if (ok) {
      try {
        const html = await fetch(url, { signal: AbortSignal.timeout(10_000) }).then((r) => r.text())
        hasTitle = /<title>[^<]{3,}<\/title>/i.test(html)
        hasDesc =
          /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{3,}["']/i.test(html) ||
          /<meta[^>]+content=["'][^"']{3,}["'][^>]+name=["']description["']/i.test(html)
      } catch {
        // parse error — treat as fail
      }
    }
    const pass = ok && hasTitle && hasDesc
    pdpRows.push({
      url,
      status,
      pass,
      note: !ok ? 'Non-200' : !hasTitle ? 'Missing <title>' : !hasDesc ? 'Missing meta description' : '',
      hasTitle,
      hasDesc,
    })
  }

  const pdpPass = pdpRows.filter((r) => r.pass).length
  const pdpFail = pdpRows.filter((r) => !r.pass).length
  lines.push(
    `## §2 PDP Stratified Sample (§17.3) — ${pdpRows.length} sampled — ${pdpPass} pass / ${pdpFail} fail`,
  )
  lines.push('')
  if (pdpRows.length === 0) {
    lines.push('_No products found in any roadmap collection. Check Shopify import and env vars._')
  } else {
    lines.push('| URL | Status | Title | Desc | Result |')
    lines.push('|-----|--------|-------|------|--------|')
    for (const r of pdpRows) {
      lines.push(
        `| ${r.url} | ${r.status} | ${r.hasTitle ? '✅' : '❌'} | ${r.hasDesc ? '✅' : '❌'} | ${r.pass ? '✅ PASS' : `❌ FAIL — ${r.note}`} |`,
      )
    }
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/URL-HEALTH-REPORT.md', report)
  console.log(`\nURL-HEALTH: categories ${catPass}✅ ${catFail}❌ | PDPs ${pdpPass}✅ ${pdpFail}❌`)
  console.log('Report written to audit/URL-HEALTH-REPORT.md')

  if (catFail > 0 || (pdpRows.length > 0 && pdpFail / pdpRows.length > 0.1)) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run it (localhost:3000 must be up)**

```bash
npx tsx scripts/check-url-health.ts
```

Expected: prints summary line, writes `audit/URL-HEALTH-REPORT.md`. If any category URL returns non-200 or >10% of PDP sample fails, it exits 1 — investigate failures in the report before proceeding.

- [ ] **Step 3: Commit script + report**

```bash
git add scripts/check-url-health.ts audit/URL-HEALTH-REPORT.md
git commit -m "audit: add URL health check script; run post-import (Track 2)"
```

---

### Task 4: Build and run `scripts/check-sitemap.ts` (Track 3)

**Files:**
- Create: `scripts/check-sitemap.ts`
- Output: `audit/SITEMAP-REPORT.md`

**Interfaces:**
- Consumes: `docs/redirects-ready.json` (1,285 product redirect entries), `proxy.ts` inline `REDIRECT_ENTRIES` (category 301s).
- Produces: `audit/SITEMAP-REPORT.md` — §1 sitemap URL table, §2 redirect spot-check table.

- [ ] **Step 1: Create `scripts/check-sitemap.ts`**

```typescript
import { writeFileSync, readFileSync } from 'fs'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const BASE_URL = process.env.SITE_URL ?? 'http://localhost:3000'

async function checkUrl(
  url: string,
  follow: boolean,
): Promise<{ status: number | string; location?: string }> {
  try {
    const res = await fetch(url, {
      redirect: follow ? 'follow' : 'manual',
      signal: AbortSignal.timeout(10_000),
    })
    const location = res.headers.get('location') ?? undefined
    return { status: res.status, location }
  } catch (e) {
    return { status: `ERROR: ${(e as Error).message}` }
  }
}

async function main() {
  const lines: string[] = []
  lines.push('# Sitemap Report')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Base URL: ${BASE_URL}`)
  lines.push('')

  // ── §1 Sitemap URL health ──────────────────────────────────────────────────
  let xml: string
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      lines.push(`## §1 Sitemap — ERROR: /sitemap.xml returned ${res.status}`)
      writeFileSync('audit/SITEMAP-REPORT.md', lines.join('\n') + '\n')
      process.exit(1)
    }
    xml = await res.text()
  } catch (e) {
    lines.push(`## §1 Sitemap — ERROR: ${(e as Error).message}`)
    writeFileSync('audit/SITEMAP-REPORT.md', lines.join('\n') + '\n')
    process.exit(1)
  }

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  lines.push(`## §1 Sitemap URLs — ${locs.length} entries`)
  lines.push('')
  lines.push('| URL | Status | Result |')
  lines.push('|-----|--------|--------|')

  let sitemapFail = 0
  for (const loc of locs) {
    const { status } = await checkUrl(loc, true)
    const ok = status === 200
    if (!ok) sitemapFail++
    lines.push(`| ${loc} | ${status} | ${ok ? '✅' : '❌'} |`)
  }
  lines.push('')
  lines.push(`**Summary:** ${locs.length - sitemapFail} pass / ${sitemapFail} fail`)
  lines.push('')

  // ── §2 Product redirect spot-check (redirects-ready.json) ─────────────────
  // proxy.ts rewrites /products/ → /product/ in Location header.
  // We confirm status is 3xx and Location is non-empty; we do not match exact destination.
  const allRedirects = JSON.parse(
    readFileSync('docs/redirects-ready.json', 'utf-8'),
  ) as { from: string; to: string }[]
  const step = Math.ceil(allRedirects.length / 50)
  const sample = allRedirects.filter((_, i) => i % step === 0).slice(0, 50)

  lines.push(
    `## §2 Product Redirect Spot-Check — ${sample.length} sampled from ${allRedirects.length} total`,
  )
  lines.push('')
  lines.push('| From | Status | Location | Result |')
  lines.push('|------|--------|----------|--------|')

  let redirectFail = 0
  for (const entry of sample) {
    const { status, location } = await checkUrl(`${BASE_URL}${entry.from}`, false)
    const isRedirect = typeof status === 'number' && status >= 300 && status < 400
    const ok = isRedirect && !!location
    if (!ok) redirectFail++
    lines.push(
      `| ${entry.from} | ${status} | ${location ?? '—'} | ${ok ? '✅' : '❌'} |`,
    )
  }
  lines.push('')
  lines.push(`**Summary:** ${sample.length - redirectFail} pass / ${redirectFail} fail`)
  lines.push('')

  // ── §3 Category-level redirect/410 checks (from proxy.ts known entries) ────
  const categoryRedirects = [
    { from: '/Medical-Supply-Store.html', expectedStatus: 301 },
    { from: '/all-categories.html', expectedStatus: 301 },
    { from: '/brands/drive-medical', expectedStatus: 301 },
    { from: '/category/pharmaceuticals', expectedStatus: 410 },
    { from: '/category/beds', expectedStatus: 410 },
    { from: '/category/pet', expectedStatus: 410 },
  ]

  lines.push('## §3 Category Redirect / 410 Checks')
  lines.push('')
  lines.push('| Path | Expected | Actual | Result |')
  lines.push('|------|----------|--------|--------|')

  let catRedirectFail = 0
  for (const entry of categoryRedirects) {
    const { status } = await checkUrl(`${BASE_URL}${entry.from}`, false)
    const ok = status === entry.expectedStatus
    if (!ok) catRedirectFail++
    lines.push(`| ${entry.from} | ${entry.expectedStatus} | ${status} | ${ok ? '✅' : '❌'} |`)
  }
  lines.push('')
  lines.push(
    `**Summary:** ${categoryRedirects.length - catRedirectFail} pass / ${catRedirectFail} fail`,
  )

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/SITEMAP-REPORT.md', report)
  console.log(
    `\nSITEMAP: locs ${locs.length - sitemapFail}✅ ${sitemapFail}❌ | product redirects ${sample.length - redirectFail}✅ ${redirectFail}❌ | category redirects ${categoryRedirects.length - catRedirectFail}✅ ${catRedirectFail}❌`,
  )
  console.log('Report written to audit/SITEMAP-REPORT.md')

  if (sitemapFail > 0 || redirectFail > 5 || catRedirectFail > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run it**

```bash
npx tsx scripts/check-sitemap.ts
```

Expected: prints summary, writes `audit/SITEMAP-REPORT.md`. If it exits 1, open the report and investigate which URLs are failing.

- [ ] **Step 3: Commit script + report**

```bash
git add scripts/check-sitemap.ts audit/SITEMAP-REPORT.md
git commit -m "audit: add sitemap validator script; run post-import (Track 3)"
```

---

### Task 5: Build and run `scripts/check-seo-metadata.ts` (Track 4)

**Files:**
- Create: `scripts/check-seo-metadata.ts`
- Output: `audit/SEO-METADATA-REPORT.md`

**Interfaces:**
- Consumes: `GET_COLLECTION_PRODUCT_HANDLES` from Task 2 (to resolve a live PDP handle), `jsdom` from devDependencies.
- Produces: `audit/SEO-METADATA-REPORT.md` — per-page results for canonical, robots, OG, JSON-LD, + internal link sample.

- [ ] **Step 1: Create `scripts/check-seo-metadata.ts`**

```typescript
import { writeFileSync } from 'fs'
import { loadEnvConfig } from '@next/env'
import { JSDOM } from 'jsdom'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTION_PRODUCT_HANDLES } from '../lib/shopify/queries/collections'

loadEnvConfig(process.cwd())

const BASE_URL = process.env.SITE_URL ?? 'http://localhost:3000'

async function fetchHtml(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

type CheckResult = { label: string; pass: boolean; detail?: string }

async function auditPage(
  path: string,
  label: string,
  expectProductSchema: boolean,
): Promise<{
  path: string
  label: string
  error: boolean
  checks: CheckResult[]
  internalLinks: string[]
}> {
  const html = await fetchHtml(path)
  if (!html) {
    return { path, label, error: true, checks: [], internalLinks: [] }
  }

  const dom = new JSDOM(html)
  const doc = dom.window.document

  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? ''
  const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? ''
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? ''
  const ogDesc =
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? ''
  const ogImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? ''
  const ldBlocks = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
    try {
      return JSON.parse(s.textContent ?? '{}') as Record<string, unknown>
    } catch {
      return {}
    }
  })
  const hasProductSchema = ldBlocks.some((b) => b['@type'] === 'Product')

  const checks: CheckResult[] = [
    { label: 'canonical present', pass: canonical.length > 0, detail: canonical || '—' },
    {
      label: 'not noindex',
      pass: !robotsMeta.includes('noindex'),
      detail: robotsMeta || '(absent = index)',
    },
    { label: 'og:title present', pass: ogTitle.length > 0, detail: ogTitle.slice(0, 60) || '—' },
    {
      label: 'og:description present',
      pass: ogDesc.length > 0,
      detail: ogDesc.slice(0, 60) || '—',
    },
    { label: 'og:image present', pass: ogImage.length > 0, detail: ogImage.slice(0, 60) || '—' },
    { label: 'JSON-LD present', pass: ldBlocks.length > 0, detail: `${ldBlocks.length} block(s)` },
    ...(expectProductSchema
      ? [
          {
            label: 'Product schema (@type:Product)',
            pass: hasProductSchema,
            detail: hasProductSchema ? 'found' : 'missing',
          },
        ]
      : []),
  ]

  const internalLinks = [...doc.querySelectorAll('a[href]')]
    .map((a) => a.getAttribute('href') ?? '')
    .filter((h) => h.startsWith('/') && !h.startsWith('//') && !h.startsWith('/#'))
    .slice(0, 20)

  return { path, label, error: false, checks, internalLinks }
}

async function main() {
  const lines: string[] = []
  lines.push('# SEO Metadata Report')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Base URL: ${BASE_URL}`)
  lines.push('')

  // Resolve a live PDP handle from the gloves collection
  let pdpHandle = 'unknown'
  try {
    const data = await storefrontFetch<{
      collection: { products: { nodes: { handle: string }[] } } | null
    }>(GET_COLLECTION_PRODUCT_HANDLES, { handle: 'gloves', first: 1 })
    pdpHandle = data.collection?.products.nodes[0]?.handle ?? 'unknown'
  } catch {
    // env not configured or collection missing — pdpHandle stays 'unknown'
  }

  const pages = [
    { path: '/', label: 'Home', expectProduct: false },
    { path: '/categories', label: 'Categories Hub', expectProduct: false },
    { path: '/category/gloves', label: 'L1 Category (gloves)', expectProduct: false },
    { path: `/shop/${pdpHandle}`, label: `PDP (${pdpHandle})`, expectProduct: true },
    { path: '/blog', label: 'Blog Hub', expectProduct: false },
  ]

  let totalFail = 0

  for (const page of pages) {
    const result = await auditPage(page.path, page.label, page.expectProduct)
    lines.push(`## ${result.label} — \`${result.path}\``)
    lines.push('')

    if (result.error) {
      lines.push('❌ **ERROR: Page did not respond with 200**')
      lines.push('')
      totalFail++
      continue
    }

    lines.push('| Check | Detail | Result |')
    lines.push('|-------|--------|--------|')
    for (const c of result.checks) {
      if (!c.pass) totalFail++
      lines.push(
        `| ${c.label} | ${c.detail ?? ''} | ${c.pass ? '✅ PASS' : '❌ FAIL'} |`,
      )
    }
    lines.push('')

    if (result.internalLinks.length > 0) {
      lines.push('**Internal link sample (first 20):**')
      lines.push('')
      lines.push('| Link | Status |')
      lines.push('|------|--------|')
      for (const href of result.internalLinks) {
        try {
          const res = await fetch(`${BASE_URL}${href}`, {
            redirect: 'manual',
            signal: AbortSignal.timeout(8_000),
          })
          const ok = res.status === 200
          if (!ok) totalFail++
          lines.push(`| ${href} | ${ok ? `✅ ${res.status}` : `❌ ${res.status}`} |`)
        } catch {
          lines.push(`| ${href} | ❌ ERROR |`)
          totalFail++
        }
      }
      lines.push('')
    }
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/SEO-METADATA-REPORT.md', report)
  console.log(`\nSEO-METADATA: ${totalFail} failures across all pages`)
  console.log('Report written to audit/SEO-METADATA-REPORT.md')

  if (totalFail > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run it**

```bash
npx tsx scripts/check-seo-metadata.ts
```

Expected: checks all 5 representative pages, prints failure count, writes `audit/SEO-METADATA-REPORT.md`. If PDP handle is `unknown`, the PDP row will error — ensure `.env.local` is set and `localhost:3000` is running.

- [ ] **Step 3: Commit script + report**

```bash
git add scripts/check-seo-metadata.ts audit/SEO-METADATA-REPORT.md
git commit -m "audit: add SEO metadata validator script; run post-import (Track 4)"
```

---

### Task 6: Build and run `scripts/check-security-headers.ts` (Track 5)

**Files:**
- Create: `scripts/check-security-headers.ts`
- Output: `audit/SECURITY-REPORT.md`

**Interfaces:**
- Consumes: `next.config.ts` (source-level check), `instrumentation.ts` (Sentry check).
- Produces: `audit/SECURITY-REPORT.md` — §1 HTTP headers, §2 next.config.ts source check, §3 Sentry status, §4 rollback note.

- [ ] **Step 1: Create `scripts/check-security-headers.ts`**

```typescript
import { writeFileSync, readFileSync } from 'fs'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const BASE_URL = process.env.SITE_URL ?? 'http://localhost:3000'

// Accept either the header or its report-only variant (CSP is deployed as Report-Only)
function headerPresent(headers: Headers, name: string): boolean {
  return headers.has(name) || headers.has(`${name}-report-only`)
}

function headerValue(headers: Headers, name: string): string {
  return (headers.get(name) ?? headers.get(`${name}-report-only`) ?? '').slice(0, 100)
}

const REQUIRED_HEADERS = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
]

async function main() {
  const lines: string[] = []
  lines.push('# Security Report')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Base URL: ${BASE_URL}`)
  lines.push('')

  // ── §1 HTTP Response Headers ───────────────────────────────────────────────
  let responseHeaders: Headers
  try {
    const res = await fetch(`${BASE_URL}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
    })
    responseHeaders = res.headers
  } catch (e) {
    lines.push(`## §1 Security Headers — ERROR fetching ${BASE_URL}/: ${(e as Error).message}`)
    lines.push('')
    lines.push('Ensure `npm run dev` is running and try again.')
    writeFileSync('audit/SECURITY-REPORT.md', lines.join('\n') + '\n')
    process.exit(1)
  }

  lines.push('## §1 HTTP Security Headers')
  lines.push('')
  lines.push('| Header | Present | Value (truncated to 100 chars) |')
  lines.push('|--------|---------|-------------------------------|')

  let headerFail = 0
  for (const name of REQUIRED_HEADERS) {
    const present = headerPresent(responseHeaders, name)
    if (!present) headerFail++
    const value = headerValue(responseHeaders, name)
    lines.push(`| \`${name}\` | ${present ? '✅' : '❌'} | ${value || '—'} |`)
  }
  lines.push('')

  // ── §2 next.config.ts source check ────────────────────────────────────────
  lines.push('## §2 next.config.ts Source Definitions')
  lines.push('')
  const nextConfig = readFileSync('next.config.ts', 'utf-8')
  const sourceChecks: [string, boolean][] = [
    ['CSP defined', /content-security-policy/i.test(nextConfig)],
    ['X-Frame-Options defined', /x-frame-options/i.test(nextConfig)],
    ['X-Content-Type-Options defined', /x-content-type-options/i.test(nextConfig)],
    ['Referrer-Policy defined', /referrer-policy/i.test(nextConfig)],
    ['Permissions-Policy defined', /permissions-policy/i.test(nextConfig)],
  ]

  let configFail = 0
  lines.push('| Check | Result |')
  lines.push('|-------|--------|')
  for (const [label, pass] of sourceChecks) {
    if (!pass) configFail++
    lines.push(`| ${label} | ${pass ? '✅ PASS' : '❌ FAIL'} |`)
  }
  lines.push('')

  // ── §3 Sentry ─────────────────────────────────────────────────────────────
  lines.push('## §3 Sentry Error Monitoring')
  lines.push('')
  const instrumentation = readFileSync('instrumentation.ts', 'utf-8')
  const hasSentryInit =
    /sentry/i.test(instrumentation) || /@sentry/i.test(instrumentation)
  lines.push(`| Check | Result |`)
  lines.push(`|-------|--------|`)
  lines.push(
    `| Sentry referenced in instrumentation.ts | ${hasSentryInit ? '✅ PASS' : '⚠️ NOT YET CONFIGURED — action required before launch'} |`,
  )
  lines.push('')
  if (!hasSentryInit) {
    lines.push(
      '> **Action required:** Sentry is not yet wired up. Install `@sentry/nextjs`, add DSN to `.env.local`/Vercel env vars, and initialise in `instrumentation.ts` before launch.',
    )
    lines.push('')
  }

  // ── §4 Rollback Notes ──────────────────────────────────────────────────────
  lines.push('## §4 Rollback Notes')
  lines.push('')
  lines.push(
    'Security headers are defined in `next.config.ts` `headers()` export (commit `20d2513`).',
  )
  lines.push('To rollback security headers: `git revert 20d2513` then redeploy.')
  lines.push('Vercel deployment reference: `docs/DEV-02-vercel-setup.md`')
  lines.push(
    'Uptime monitoring: configure an external check (UptimeRobot / Vercel Analytics) targeting the production domain once DNS cutover is complete.',
  )
  lines.push('')

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/SECURITY-REPORT.md', report)
  console.log(
    `\nSECURITY: ${headerFail} headers missing | ${configFail} config checks failed | Sentry: ${hasSentryInit ? 'configured' : 'NOT YET CONFIGURED'}`,
  )
  console.log('Report written to audit/SECURITY-REPORT.md')

  if (headerFail > 0 || configFail > 0) {
    process.exit(1)
  }
  // Sentry missing is a warning, not a hard failure (pre-launch TODO)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run it**

```bash
npx tsx scripts/check-security-headers.ts
```

Expected: all 5 headers present (CSP as Report-Only), all source checks pass, Sentry shows ⚠️ (not yet configured). Exits 0 if headers pass (Sentry is a warning, not a hard failure). Report written to `audit/SECURITY-REPORT.md`.

- [ ] **Step 3: Commit script + report**

```bash
git add scripts/check-security-headers.ts audit/SECURITY-REPORT.md
git commit -m "audit: add security headers checker script; run post-import (Track 5)"
```

---

### Task 7: Create runner + manual checklist

**Files:**
- Create: `scripts/run-post-import-runbook.sh`
- Create: `docs/post-import-qa-checklist.md`

**Interfaces:**
- Produces: the two deliverables that close the ticket once filled in by a human.

- [ ] **Step 1: Create `scripts/run-post-import-runbook.sh`**

```bash
#!/usr/bin/env bash
set -e
BASE_URL="${SITE_URL:-http://localhost:3000}"
echo "========================================"
echo " Post-Import Runbook — §17.2"
echo " Target: $BASE_URL"
echo " Prereq: npm run dev must be running"
echo "========================================"
echo ""

echo "=== Track 1: E4 Collection Audit ==="
npx tsx scripts/audit-collections.ts
echo ""

echo "=== Track 2: URL Health ==="
npx tsx scripts/check-url-health.ts
echo ""

echo "=== Track 3: Sitemap + Redirects ==="
npx tsx scripts/check-sitemap.ts
echo ""

echo "=== Track 4: SEO Metadata / Schema ==="
npx tsx scripts/check-seo-metadata.ts
echo ""

echo "=== Track 5: Security Headers ==="
npx tsx scripts/check-security-headers.ts
echo ""

echo "========================================"
echo " All automated checks complete."
echo " Reports written to audit/"
echo ""
echo " Next: fill in docs/post-import-qa-checklist.md"
echo " (GTM, Merchant Center, P0/P1 close, sign-off)"
echo "========================================"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/run-post-import-runbook.sh
```

- [ ] **Step 3: Create `docs/post-import-qa-checklist.md`**

```markdown
# Post-Import QA Checklist — §17.2

**Date:** ___________
**Tester:** ___________
**Environment:** ___________

---

## Automated Checks (scripts/run-post-import-runbook.sh)

Run against localhost:3000 (or SITE_URL env var) with npm run dev active.

- [ ] Track 1 — E4 Collection Audit (`audit/category-nav-audit-report.md`)
  - §9 Orphan Handles: _________________
  - §11 Action Items (unmapped): _________________
- [ ] Track 2 — URL Health (`audit/URL-HEALTH-REPORT.md`)
  - Category URLs: ___/__ pass
  - PDP sample: ___/100 pass
- [ ] Track 3 — Sitemap (`audit/SITEMAP-REPORT.md`)
  - Sitemap locs: ___/__ pass
  - Product redirects sample: ___/50 pass
  - Category redirects/410s: ___/6 pass
- [ ] Track 4 — SEO Metadata (`audit/SEO-METADATA-REPORT.md`)
  - Pages with failures: _________________
- [ ] Track 5 — Security Headers (`audit/SECURITY-REPORT.md`)
  - Headers: ___/5 present
  - Sentry status: _________________

---

## GTM / GA4 Verification

Open Chrome DevTools → Console. Verify `dataLayer` array after each action.

- [ ] **Pageview** — load any page → `dataLayer` contains `{event: 'page_view', ...}`
- [ ] **Product view** — open a PDP → `dataLayer` contains `{event: 'view_item', items: [...]}`
- [ ] **Add to cart** — click Add to Cart → `dataLayer` contains `{event: 'add_to_cart', items: [...]}`
- [ ] **Begin checkout** — start checkout → `dataLayer` contains `{event: 'begin_checkout', ...}`
- [ ] **B2B form submit** — submit `/b2b` form → `dataLayer` contains a form submission event
- [ ] **Contact form submit** — submit `/contact` form → form submission event fires
- [ ] **Purchase** — complete one test order → `dataLayer` contains `{event: 'purchase', transaction_id: '...', value: ..., items: [...]}`
- [ ] **GA4 DebugView** — Admin → DebugView → all events above appear within 60 seconds

Notes: _________________

---

## Google Merchant Center Feed

- [ ] Merchant Center → Products → Feeds → feed URL confirmed correct: _________________
- [ ] Spot-check product 1 — feed `link` matches `/shop/{handle}`; title + price match PDP: _________________
- [ ] Spot-check product 2: _________________
- [ ] Spot-check product 3: _________________
- [ ] No disapproved products caused by landing page mismatch (check Diagnostics tab)

Notes: _________________

---

## Open P0 / P1 Issues

| Issue | Description | Owner | Status |
|-------|-------------|-------|--------|
| | | | |
| | | | |

---

## Sign-Off

All automated checks pass and manual checklist is complete.

**Lead sign-off:** ________________________

**Date:** __________

**Notes / caveats:**
```

- [ ] **Step 4: Commit both files**

```bash
git add scripts/run-post-import-runbook.sh docs/post-import-qa-checklist.md
git commit -m "feat: add post-import runbook runner and manual QA checklist"
```

---

## Self-Review

### Spec Coverage

| Ticket task | Covered by |
|-------------|------------|
| E4 — export collection/handle/type/count/visibility/parent/image/SEO → mismatch report | Task 1 (re-run audit-collections.ts, 11-section report) |
| Verify nav/hub/footer/breadcrumbs/sitemap same normalized output | Task 1 §§3–10 surface consistency sections |
| Every approved L1/L2 returns 200, correct hierarchy, no removed categories | Task 3 §1 (check-url-health.ts category check) |
| 100-PDP stratified QA (§17.3) | Task 3 §2 (PDP sample) |
| Sitemap URL-by-URL; redirects/410s on deployed domain | Task 4 §§1–3 (check-sitemap.ts) |
| Schema/metadata/canonical/robots/OG/internal links validate live | Task 5 (check-seo-metadata.ts) |
| GTM/pageviews/ecommerce/forms/checkout attribution + one purchase | Task 7 (manual checklist — GTM section) |
| Merchant Center feed/landing parity | Task 7 (manual checklist — Merchant Center section) |
| Security headers, Sentry, uptime checks, rollback docs | Task 6 (check-security-headers.ts + rollback note; uptime = post-DNS item) |
| Close every P0/P1 and obtain written sign-off | Task 7 (manual checklist — P0/P1 table + sign-off block) |

### Placeholder Scan

- All code steps contain complete, runnable TypeScript.
- All bash steps show exact commands with expected output.
- Manual checklist has fill-in fields, not vague TODOs.
- Sentry non-configuration is explicitly documented as a pre-launch action item, not left as TBD.

### Type Consistency

- `GET_COLLECTION_PRODUCT_HANDLES` defined in Task 2, imported with identical name in Tasks 3 and 5.
- `getAllowedHandles()` returns `Set<string>` — used with `for...of` in Task 3 (compatible).
- `ROADMAP_CATEGORIES` has `.matchedHandles: string[]` — iterated in Task 3 PDP loop.
- `storefrontFetch<T>` generic — T matches the inline type literal in each call site.
