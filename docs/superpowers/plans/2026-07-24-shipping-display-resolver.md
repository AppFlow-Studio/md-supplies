# Shipping Display Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a versioned, schema-validated shipping-display resolver for `shipping-facts-v3.json`, and wire it into product cards, PDP, and cart, entirely behind a feature flag that stays disabled in production (DEV-SHIP-01).

**Architecture:** A new server-only module `lib/shipping-resolver/` loads the data file once, validates its byte checksum and schema, and exposes three pure lookup functions that only ever return `public_display_class` + approved `display_copy` — never `effective_rate_class`/`diagnostic_status`. Server components/actions call the resolver and attach the result to data before it crosses to client components; client components never call the resolver directly.

**Tech Stack:** Next.js 16 (App Router), TypeScript, zod 4 (already a dependency), vitest 4, `server-only` package (already used elsewhere in `lib/`).

**Design doc:** `docs/superpowers/specs/2026-07-24-shipping-display-resolver-design.md`

## Global Constraints

- Only `public_display_class` and (where populated) `display_copy` may ever be read into a UI-facing return value. `effective_rate_class` and `diagnostic_status` must never appear in `ShippingDisplay` or any exported resolver type.
- The exact fallback string is `Shipping calculated at checkout.` (with trailing period) — one constant, one code path produces it.
- Card-level: any variant divergence in `public_display_class` → `unknown`. PDP/cart: exact selected-variant truth.
- Feature flag `SHIPPING_RESOLVER_ENABLED` defaults to disabled on any unset/non-`'true'` value. Every UI wiring task must leave current production behavior byte-for-byte unchanged when the flag is off.
- Never state an exact paid shipping rate anywhere.
- `hold: true` suppresses the claim only — never hides a product, disables purchase, or blocks checkout (nothing in this plan touches availability/purchasability).
- Pinned data checksum (SHA-256 of the actual delivered `shipping-facts-v3.json` bytes, not the file's own self-declared value): `431fdd1960d77514e3fec79dfbb9403b8f735e22a690c28f2c2781a656f4d324`.
- Do not implement: freight behavior, Canada restriction enforcement, delivery-profile/rate/location/Markets changes, `custom.free_shipping` metafield cleanup, or a general feature-flag framework (this ticket uses one plain env var, matching the codebase's existing `NEXT_PUBLIC_IS_STAGING` convention).

## Context for the implementer

- `shipping-facts-v3.json` (17MB, 7,385 products / 10,293 variants) already exists on the machine that ran discovery at `C:\Users\sarik\OneDrive\Desktop\app-flow\shipping-facts-v3.json`. It is keyed `{ _meta, delivery_profiles: [...], products: { [productGid]: ProductRecord } }`, `ProductRecord.variants: { [variantGid]: VariantRecord }`.
- Two small, real-data-derived test fixture files already exist in the repo (created during planning, see Task 3) at `lib/shipping-resolver/__tests__/fixtures/valid-payload.json` (19 real products/variants, checksum `802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53`) and `lib/shipping-resolver/__tests__/fixtures/duplicate-variant-payload.json` (synthetic, checksum `900b5bd2691e4491f3fd58b9ce92e353b7f43628b86157e4de1657c7d4a51865`). Do not regenerate or edit these — later tasks depend on their exact byte content and checksums.
- Existing free-shipping badges are currently driven by a Shopify **tag** (`product.tags.includes('free-shipping')`), copy-pasted inline across five places: `components/store/ShopifyProductCard.tsx` (the real category-grid card), `components/product/QuickAddContent.tsx` (quick-add modal), `components/product/ProductView.tsx` (PDP). Two more copies — `components/product/ProductBadges.tsx`/`ProductCard.tsx` and their `hasFreeShipping` field — exist but are **dead code**, imported by nothing in `app/` (confirmed via grep; only referenced from tests). This plan does not touch the dead ones.
- `components/product/ShippingBlock.tsx` exists but is imported nowhere (dead code) — Task 10 repurposes it.
- Product listing pages that feed `ShopifyProductCard` fetch via `components/category/CategoryResults.tsx` (server component) → `<ProductGrid products={...} />`. This plan wires that one choke point (the ticket's "product cards" surface). Other product-listing surfaces (`app/page.tsx` homepage sections, `app/search/page.tsx`, partner/industry pages) do not currently render any free-shipping badge at all today and are out of scope — flagged as a known gap, not silently missed.
- Cart lines already carry `merchandise.id` (variant GID) and `merchandise.product.id` (product GID) via `CART_FRAGMENT`. The cart hydrates client-side through server actions in `app/actions/cart.ts`.

---

### Task 1: Data file and environment plumbing

**Files:**
- Create: `data/shipping-facts-v3.json` (gitignored, not committed)
- Modify: `.gitignore`
- Modify: `.env.example`

**Interfaces:**
- Produces: the on-disk data file that `lib/shipping-resolver/data.ts` (Task 4) reads via `SHIPPING_FACTS_PATH`.

- [ ] **Step 1: Copy the data file into the gitignored location**

```bash
mkdir -p data
cp "/c/Users/sarik/OneDrive/Desktop/app-flow/shipping-facts-v3.json" data/shipping-facts-v3.json
```

- [ ] **Step 2: Verify the copy is byte-identical (checksum must match the pinned constant)**

```bash
node -e "const c=require('crypto'),f=require('fs');console.log(c.createHash('sha256').update(f.readFileSync('data/shipping-facts-v3.json')).digest('hex'))"
```

Expected output: `431fdd1960d77514e3fec79dfbb9403b8f735e22a690c28f2c2781a656f4d324`

- [ ] **Step 3: Add the gitignore entry**

Add to `.gitignore`, in the "misc" section (near the `.env*` entries):

```gitignore
# shipping-facts data (17MB, testing-only per DEV-SHIP-01 — not committed)
/data/shipping-facts-v3.json
```

- [ ] **Step 4: Add `.env.example` documentation**

Add a new section at the end of `.env.example`:

```bash
# ── Shipping display resolver (DEV-SHIP-01) ──────────────────────────────────
# Disabled by default and MUST stay disabled in production until wording,
# data, and QA are separately approved. 'true' to enable (dev/staging only).
# SHIPPING_RESOLVER_ENABLED=

# Path to shipping-facts-v3.json (gitignored — not for production display or
# Shopify writes; see docs/superpowers/specs/2026-07-24-shipping-display-resolver-design.md).
# Defaults to data/shipping-facts-v3.json.
# SHIPPING_FACTS_PATH=

# Override for the pinned SHA-256 the resolver validates the data file
# against, only needed when the data file is intentionally replaced.
# SHIPPING_FACTS_CHECKSUM_SHA256=
```

- [ ] **Step 5: Verify `git status` shows no new tracked file**

```bash
git status --short data/
```

Expected: no output (file is ignored).

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example
git commit -m "Add shipping-facts data path plumbing (gitignored file, env vars)"
```

---

### Task 2: Resolver schema (zod validation + types)

**Files:**
- Create: `lib/shipping-resolver/schema.ts`
- Test: `lib/shipping-resolver/__tests__/schema.test.ts`

**Interfaces:**
- Produces: `shippingFactsSchema` (zod schema), `PublicDisplayClass`, `VariantRecord`, `ProductRecord`, `ShippingFactsPayload` types, `PUBLIC_DISPLAY_CLASSES` const array. Task 4 (`data.ts`) imports `shippingFactsSchema`, `ProductRecord`. Task 6 (`resolve.ts`) imports `PublicDisplayClass`.

- [ ] **Step 1: Write the failing test**

Create `lib/shipping-resolver/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { shippingFactsSchema } from '../schema'

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    handle: 'test',
    title: 'Test',
    diagnostic_status: 'clean_free',
    public_display_class: 'standard-free',
    display_copy: null,
    hold: false,
    hold_reason: null,
    canada_status: 'n/a',
    variants: {
      'gid://shopify/ProductVariant/1': {
        sku: 'SKU1',
        effective_rate_class: 'FREE',
        diagnostic_status: 'clean_free',
        public_display_class: 'standard-free',
        display_copy: null,
      },
    },
    ...overrides,
  }
}

function payload(products: Record<string, unknown>) {
  return {
    _meta: { schema_version: 'v3.0' },
    delivery_profiles: [],
    products,
  }
}

describe('shippingFactsSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = shippingFactsSchema.safeParse(
      payload({ 'gid://shopify/Product/1': validProduct() }),
    )
    expect(result.success).toBe(true)
  })

  it('accepts every documented public_display_class value', () => {
    for (const cls of ['standard-free', 'threshold', 'standard-paid', 'manual-quote', 'unknown']) {
      const result = shippingFactsSchema.safeParse(
        payload({ 'gid://shopify/Product/1': validProduct({ public_display_class: cls }) }),
      )
      expect(result.success, `class ${cls} should be valid`).toBe(true)
    }
  })

  it('rejects an invalid public_display_class value', () => {
    const result = shippingFactsSchema.safeParse(
      payload({ 'gid://shopify/Product/1': validProduct({ public_display_class: 'totally-free-no-catch' }) }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects a payload missing required product fields', () => {
    const result = shippingFactsSchema.safeParse(
      payload({ 'gid://shopify/Product/1': { handle: 'test' } }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects a payload missing the top-level products key', () => {
    const result = shippingFactsSchema.safeParse({
      _meta: { schema_version: 'v3.0' },
      delivery_profiles: [],
    })
    expect(result.success).toBe(false)
  })

  it('allows unknown extra fields on product and variant records (passthrough)', () => {
    const result = shippingFactsSchema.safeParse(
      payload({
        'gid://shopify/Product/1': validProduct({ some_future_field: 'x' }),
      }),
    )
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run lib/shipping-resolver/__tests__/schema.test.ts
```

Expected: FAIL — `Cannot find module '../schema'`.

- [ ] **Step 3: Write the schema**

Create `lib/shipping-resolver/schema.ts`:

```typescript
import { z } from 'zod'

export const PUBLIC_DISPLAY_CLASSES = [
  'standard-free',
  'threshold',
  'standard-paid',
  'manual-quote',
  'unknown',
] as const

const publicDisplayClassSchema = z.enum(PUBLIC_DISPLAY_CLASSES)

const variantRecordSchema = z
  .object({
    sku: z.string().nullable(),
    effective_rate_class: z.enum(['FREE', 'THRESHOLD', 'PAID', 'COND_PAID']).nullable(),
    diagnostic_status: z.string(),
    public_display_class: publicDisplayClassSchema,
    display_copy: z.string().nullable(),
  })
  .passthrough()

const productRecordSchema = z
  .object({
    handle: z.string(),
    title: z.string(),
    diagnostic_status: z.string(),
    public_display_class: publicDisplayClassSchema,
    display_copy: z.string().nullable(),
    hold: z.boolean(),
    hold_reason: z.string().nullable(),
    canada_status: z.string(),
    variants: z.record(z.string(), variantRecordSchema),
  })
  .passthrough()

export const shippingFactsSchema = z
  .object({
    _meta: z.object({ schema_version: z.string() }).passthrough(),
    delivery_profiles: z.array(z.unknown()),
    products: z.record(z.string(), productRecordSchema),
  })
  .passthrough()

export type PublicDisplayClass = z.infer<typeof publicDisplayClassSchema>
export type VariantRecord = z.infer<typeof variantRecordSchema>
export type ProductRecord = z.infer<typeof productRecordSchema>
export type ShippingFactsPayload = z.infer<typeof shippingFactsSchema>
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/shipping-resolver/__tests__/schema.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/shipping-resolver/schema.ts lib/shipping-resolver/__tests__/schema.test.ts
git commit -m "Add shipping-facts payload schema (zod validation)"
```

---

### Task 3: Verify committed test fixtures

The two fixture files below were generated during planning directly from the real `shipping-facts-v3.json` (19 real products covering every `diagnostic_status` bucket present in the dataset, all 17 unsafe-FREE variants across 12 products, both `hold_reason` values, one Canada-restricted product, and 9 of the 153 variant-divergent products) plus one small synthetic fixture for the duplicate-GID case. This task only verifies they're present and correct — do not regenerate them.

**Files:**
- Verify: `lib/shipping-resolver/__tests__/fixtures/valid-payload.json`
- Verify: `lib/shipping-resolver/__tests__/fixtures/duplicate-variant-payload.json`

**Interfaces:**
- Produces: fixture files consumed by Task 4 (`data.test.ts`) and Task 6 (`resolve.test.ts`).

- [ ] **Step 1: Verify both files exist with the expected checksums**

```bash
node -e "
const c=require('crypto'),f=require('fs');
for (const [p,expected] of [
  ['lib/shipping-resolver/__tests__/fixtures/valid-payload.json','802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'],
  ['lib/shipping-resolver/__tests__/fixtures/duplicate-variant-payload.json','900b5bd2691e4491f3fd58b9ce92e353b7f43628b86157e4de1657c7d4a51865'],
]) {
  const actual = c.createHash('sha256').update(f.readFileSync(p)).digest('hex');
  console.log(p, actual === expected ? 'OK' : 'MISMATCH expected='+expected+' actual='+actual);
}
"
```

Expected: both lines print `OK`. If either is missing or mismatched, stop and re-derive it from the real `data/shipping-facts-v3.json` (Task 1) rather than hand-editing — see the design doc's Testing section for the derivation method (one product per `diagnostic_status` bucket, all 17 unsafe-FREE variants, etc.).

- [ ] **Step 2: Verify `valid-payload.json` parses and has 19 products**

```bash
node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('lib/shipping-resolver/__tests__/fixtures/valid-payload.json','utf8')).products).length)"
```

Expected: `19`

- [ ] **Step 3: Commit**

```bash
git add lib/shipping-resolver/__tests__/fixtures/
git commit -m "Add real-data-derived resolver test fixtures"
```

---

### Task 4: Data loader (checksum + schema validation, cached lookup maps, fail-safe fallback)

**Files:**
- Create: `lib/shipping-resolver/data.ts`
- Test: `lib/shipping-resolver/__tests__/data.test.ts`

**Interfaces:**
- Consumes: `shippingFactsSchema`, `ProductRecord` from `./schema` (Task 2).
- Produces: `getShippingFactsData(): ShippingFactsData` where `ShippingFactsData = { ok: boolean; productsByGid: Map<string, ProductRecord>; duplicateVariantGids: Set<string> }`, and `__resetShippingFactsCacheForTests(): void`. Task 6 (`resolve.ts`) imports `getShippingFactsData`.

- [ ] **Step 1: Write the failing tests**

Create `lib/shipping-resolver/__tests__/data.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getShippingFactsData, __resetShippingFactsCacheForTests } from '../data'

const VALID_FIXTURE = join(__dirname, 'fixtures/valid-payload.json')
const VALID_CHECKSUM = '802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'
const DUPLICATE_FIXTURE = join(__dirname, 'fixtures/duplicate-variant-payload.json')
const DUPLICATE_CHECKSUM = '900b5bd2691e4491f3fd58b9ce92e353b7f43628b86157e4de1657c7d4a51865'

beforeEach(() => {
  __resetShippingFactsCacheForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('getShippingFactsData', () => {
  it('loads successfully when the file matches the pinned checksum', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const data = getShippingFactsData()
    expect(data.ok).toBe(true)
    expect(data.productsByGid.size).toBe(19)
    expect(data.duplicateVariantGids.size).toBe(0)
  })

  it('falls back (ok: false, empty maps) on a checksum mismatch', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', '0'.repeat(64))
    const data = getShippingFactsData()
    expect(data.ok).toBe(false)
    expect(data.productsByGid.size).toBe(0)
  })

  it('falls back when the file does not exist', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', join(tmpdir(), 'does-not-exist-12345.json'))
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const data = getShippingFactsData()
    expect(data.ok).toBe(false)
  })

  it('falls back on malformed JSON', () => {
    const path = join(tmpdir(), `shipping-resolver-malformed-${Date.now()}.json`)
    writeFileSync(path, '{ this is not valid json')
    try {
      vi.stubEnv('SHIPPING_FACTS_PATH', path)
      vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', undefined as unknown as string)
      // Compute and set the correct checksum for this malformed file so we
      // reach (and fail) JSON parsing rather than the checksum check.
      const { createHash } = require('node:crypto') as typeof import('node:crypto')
      const { readFileSync } = require('node:fs') as typeof import('node:fs')
      vi.stubEnv(
        'SHIPPING_FACTS_CHECKSUM_SHA256',
        createHash('sha256').update(readFileSync(path)).digest('hex'),
      )
      const data = getShippingFactsData()
      expect(data.ok).toBe(false)
    } finally {
      unlinkSync(path)
    }
  })

  it('falls back on a payload that fails schema validation', () => {
    const path = join(tmpdir(), `shipping-resolver-bad-schema-${Date.now()}.json`)
    const badPayload = JSON.stringify({
      _meta: { schema_version: 'v3.0' },
      delivery_profiles: [],
      products: {
        'gid://shopify/Product/1': {
          handle: 'test',
          title: 'Test',
          diagnostic_status: 'clean_free',
          public_display_class: 'not-a-real-class',
          display_copy: null,
          hold: false,
          hold_reason: null,
          canada_status: 'n/a',
          variants: {},
        },
      },
    })
    writeFileSync(path, badPayload)
    try {
      const { createHash } = require('node:crypto') as typeof import('node:crypto')
      const { readFileSync } = require('node:fs') as typeof import('node:fs')
      vi.stubEnv('SHIPPING_FACTS_PATH', path)
      vi.stubEnv(
        'SHIPPING_FACTS_CHECKSUM_SHA256',
        createHash('sha256').update(readFileSync(path)).digest('hex'),
      )
      const data = getShippingFactsData()
      expect(data.ok).toBe(false)
    } finally {
      unlinkSync(path)
    }
  })

  it('detects a variant GID duplicated across two different products', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', DUPLICATE_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', DUPLICATE_CHECKSUM)
    const data = getShippingFactsData()
    expect(data.ok).toBe(true)
    expect(data.duplicateVariantGids.has('gid://shopify/ProductVariant/TEST-dup-variant')).toBe(true)
  })

  it('caches the result across repeated calls until reset', () => {
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const first = getShippingFactsData()
    const second = getShippingFactsData()
    expect(second).toBe(first)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run lib/shipping-resolver/__tests__/data.test.ts
```

Expected: FAIL — `Cannot find module '../data'`.

- [ ] **Step 3: Write the loader**

Create `lib/shipping-resolver/data.ts`:

```typescript
import 'server-only'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { shippingFactsSchema, type ProductRecord } from './schema'

// SHA-256 of the shipping-facts-v3.json bytes actually integrated against
// (pinned 2026-07-24). The file's own self-declared
// `_meta.checksum_sha256_of_payload` does not reproduce against any tried
// canonicalization of these bytes, so this is the hash of the artifact we
// tested against, not a recomputation of the generator's internal hash.
// Override via SHIPPING_FACTS_CHECKSUM_SHA256 when the data file is
// intentionally replaced, or in tests pointed at a small fixture payload.
const DEFAULT_PINNED_PAYLOAD_SHA256 =
  '431fdd1960d77514e3fec79dfbb9403b8f735e22a690c28f2c2781a656f4d324'

export interface ShippingFactsData {
  ok: boolean
  productsByGid: Map<string, ProductRecord>
  duplicateVariantGids: Set<string>
}

const EMPTY_DATA: ShippingFactsData = {
  ok: false,
  productsByGid: new Map(),
  duplicateVariantGids: new Set(),
}

let cached: ShippingFactsData | null = null

function loadShippingFactsData(): ShippingFactsData {
  const path = process.env.SHIPPING_FACTS_PATH ?? 'data/shipping-facts-v3.json'
  const pinnedChecksum =
    process.env.SHIPPING_FACTS_CHECKSUM_SHA256 ?? DEFAULT_PINNED_PAYLOAD_SHA256

  let raw: Buffer
  try {
    raw = readFileSync(path)
  } catch (err) {
    console.error('[shipping-resolver] failed to read data file at', path, err)
    return EMPTY_DATA
  }

  const actualChecksum = createHash('sha256').update(raw).digest('hex')
  if (actualChecksum !== pinnedChecksum) {
    console.error(
      `[shipping-resolver] checksum mismatch for ${path}: expected ${pinnedChecksum}, got ${actualChecksum}. Every product falls back.`,
    )
    return EMPTY_DATA
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.toString('utf8'))
  } catch (err) {
    console.error('[shipping-resolver] failed to parse data file as JSON:', err)
    return EMPTY_DATA
  }

  const result = shippingFactsSchema.safeParse(parsed)
  if (!result.success) {
    console.error('[shipping-resolver] schema validation failed:', result.error.message)
    return EMPTY_DATA
  }

  const productsByGid = new Map<string, ProductRecord>()
  const seenVariantGids = new Set<string>()
  const duplicateVariantGids = new Set<string>()

  for (const [productGid, product] of Object.entries(result.data.products)) {
    productsByGid.set(productGid, product)
    for (const variantGid of Object.keys(product.variants)) {
      if (seenVariantGids.has(variantGid)) {
        duplicateVariantGids.add(variantGid)
      } else {
        seenVariantGids.add(variantGid)
      }
    }
  }

  return { ok: true, productsByGid, duplicateVariantGids }
}

export function getShippingFactsData(): ShippingFactsData {
  if (cached === null) cached = loadShippingFactsData()
  return cached
}

/** Test-only: forces the next getShippingFactsData() call to reload from disk. */
export function __resetShippingFactsCacheForTests(): void {
  cached = null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run lib/shipping-resolver/__tests__/data.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/shipping-resolver/data.ts lib/shipping-resolver/__tests__/data.test.ts
git commit -m "Add shipping-facts data loader with checksum + schema validation"
```

---

### Task 5: Central copy configuration

**Files:**
- Create: `lib/shipping-resolver/copy.ts`

**Interfaces:**
- Consumes: `PublicDisplayClass` from `./schema` (Task 2).
- Produces: `SHIPPING_FALLBACK_MESSAGE`, `SHIPPING_CLASS_COPY`, `SHIPPING_CLASS_BADGE_LABEL`. Task 6 (`resolve.ts`) and Task 10 (`ShippingBadge.tsx`) import these.

- [ ] **Step 1: Write the file**

Create `lib/shipping-resolver/copy.ts`:

```typescript
import type { PublicDisplayClass } from './schema'

// The exact required fallback string (DEV-SHIP-01 acceptance criteria) — one
// constant, used by every invalid/missing/duplicate/unknown/held/failed path.
export const SHIPPING_FALLBACK_MESSAGE = 'Shipping calculated at checkout.'

// Placeholder copy — NOT approved for customer display (ticket item6,
// blocked on Bilal). standard-paid/manual-quote/unknown intentionally map to
// null so they fall through to SHIPPING_FALLBACK_MESSAGE, which is equally
// true for a paid shipment (checkout still calculates the exact price).
// Editing this object is the only change needed once wording is approved.
export const SHIPPING_CLASS_COPY: Record<PublicDisplayClass, string | null> = {
  'standard-free': 'Free shipping',
  threshold: 'Free shipping over a vendor minimum — see checkout for details',
  'standard-paid': null,
  'manual-quote': null,
  unknown: null,
}

// Badge label shown on cards/quick-add/PDP. Only classes with a badge appear
// here — standard-paid/manual-quote/unknown render no badge at all (silent).
export const SHIPPING_CLASS_BADGE_LABEL: Partial<Record<PublicDisplayClass, string>> = {
  'standard-free': 'Free Shipping',
  threshold: 'Free Shipping Available',
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no new errors referencing `lib/shipping-resolver/copy.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/shipping-resolver/copy.ts
git commit -m "Add central shipping display copy configuration"
```

---

### Task 6: Resolver lookup functions

**Files:**
- Create: `lib/shipping-resolver/resolve.ts`
- Test: `lib/shipping-resolver/__tests__/resolve.test.ts`

**Interfaces:**
- Consumes: `getShippingFactsData` from `./data` (Task 4); `SHIPPING_FALLBACK_MESSAGE`, `SHIPPING_CLASS_COPY` from `./copy` (Task 5); `PublicDisplayClass` from `./schema` (Task 2).
- Produces: `ShippingDisplay` type (`{ class: PublicDisplayClass; message: string; displayCopy: string | null }`), `resolveVariantShippingDisplay(productGid, variantGid): ShippingDisplay`, `resolveCardShippingDisplay(productGid): ShippingDisplay`, `resolveVariantsForProduct(productGid): Record<string, ShippingDisplay>`. Tasks 8–13 all import from here.

- [ ] **Step 1: Write the failing tests**

Create `lib/shipping-resolver/__tests__/resolve.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { __resetShippingFactsCacheForTests } from '../data'
import {
  resolveVariantShippingDisplay,
  resolveCardShippingDisplay,
  resolveVariantsForProduct,
} from '../resolve'
import { SHIPPING_FALLBACK_MESSAGE } from '../copy'

const VALID_FIXTURE = join(__dirname, 'fixtures/valid-payload.json')
const VALID_CHECKSUM = '802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'

const FALLBACK = { class: 'unknown', message: SHIPPING_FALLBACK_MESSAGE, displayCopy: null }

beforeEach(() => {
  vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
  vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
  __resetShippingFactsCacheForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('resolveVariantShippingDisplay', () => {
  it('resolves a clean_free variant to standard-free', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651919917272',
      'gid://shopify/ProductVariant/46997871591640',
    )
    expect(result).toEqual({ class: 'standard-free', message: 'Free shipping', displayCopy: null })
  })

  it('resolves a clean_threshold variant to threshold, ignoring its Canada flag', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8670729830616',
      'gid://shopify/ProductVariant/48197143396568',
    )
    expect(result.class).toBe('threshold')
    expect(result).not.toHaveProperty('canada_status')
  })

  it('resolves a conditional_min_order variant with its approved display_copy', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8693220999384',
      'gid://shopify/ProductVariant/48989065150680',
    )
    expect(result.class).toBe('standard-paid')
    expect(result.displayCopy).toBe(
      'Vendor shipping is $45.95 on orders under $700 and $20.95 on orders of $700 or more. Final shipping is calculated at checkout.',
    )
  })

  it('returns the fallback for a held product (held_medplus_fulfillment_rate_pending), never the class', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8692868743384',
      'gid://shopify/ProductVariant/48984926650584',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('returns the fallback for a held product (held_rx_pending)', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8852470595800',
      'gid://shopify/ProductVariant/50340842209496',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('never reads effective_rate_class: the unsafe-FREE trap resolves to fallback, not standard-free', () => {
    // This variant has effective_rate_class FREE but public_display_class
    // unknown — the exact trap the ticket exists to prevent.
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651920310488',
      'gid://shopify/ProductVariant/46997944238296',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('resolves the sibling (genuinely free) variant on the same product correctly', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651920310488',
      'gid://shopify/ProductVariant/51930534117592',
    )
    expect(result.class).toBe('standard-free')
  })

  it('returns the fallback for a missing product GID', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/does-not-exist',
      'gid://shopify/ProductVariant/does-not-exist',
    )
    expect(result).toEqual(FALLBACK)
  })

  it('returns the fallback for an unmatched variant GID under a real product', () => {
    const result = resolveVariantShippingDisplay(
      'gid://shopify/Product/8651919917272',
      'gid://shopify/ProductVariant/does-not-exist',
    )
    expect(result).toEqual(FALLBACK)
  })
})

describe('resolveCardShippingDisplay', () => {
  it('resolves a single-variant clean_free product to standard-free', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/8651919917272')
    expect(result.class).toBe('standard-free')
  })

  it('falls back to unknown when variants diverge, even though one variant is genuinely free', () => {
    // 8651920310488 has one unknown variant and one standard-free variant.
    const result = resolveCardShippingDisplay('gid://shopify/Product/8651920310488')
    expect(result).toEqual(FALLBACK)
  })

  it('resolves a uniformly-unknown multi-variant product to unknown (not a divergence, just unknown)', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/8695976394968')
    expect(result.class).toBe('unknown')
  })

  it('returns the fallback for a missing product GID', () => {
    const result = resolveCardShippingDisplay('gid://shopify/Product/does-not-exist')
    expect(result).toEqual(FALLBACK)
  })
})

describe('resolveVariantsForProduct', () => {
  it('returns the true per-variant class for every variant, even on a divergent product', () => {
    const result = resolveVariantsForProduct('gid://shopify/Product/8651920310488')
    expect(result['gid://shopify/ProductVariant/46997944238296'].class).toBe('unknown')
    expect(result['gid://shopify/ProductVariant/51930534117592'].class).toBe('standard-free')
  })

  it('returns an empty object for a missing product GID', () => {
    expect(resolveVariantsForProduct('gid://shopify/Product/does-not-exist')).toEqual({})
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run lib/shipping-resolver/__tests__/resolve.test.ts
```

Expected: FAIL — `Cannot find module '../resolve'`.

- [ ] **Step 3: Write the resolver**

Create `lib/shipping-resolver/resolve.ts`:

```typescript
import { getShippingFactsData } from './data'
import { SHIPPING_FALLBACK_MESSAGE, SHIPPING_CLASS_COPY } from './copy'
import type { PublicDisplayClass } from './schema'

export interface ShippingDisplay {
  class: PublicDisplayClass
  message: string
  displayCopy: string | null
}

const FALLBACK: ShippingDisplay = {
  class: 'unknown',
  message: SHIPPING_FALLBACK_MESSAGE,
  displayCopy: null,
}

function buildDisplay(publicDisplayClass: PublicDisplayClass, displayCopy: string | null): ShippingDisplay {
  return {
    class: publicDisplayClass,
    message: SHIPPING_CLASS_COPY[publicDisplayClass] ?? SHIPPING_FALLBACK_MESSAGE,
    displayCopy,
  }
}

export function resolveVariantShippingDisplay(productGid: string, variantGid: string): ShippingDisplay {
  const data = getShippingFactsData()
  if (!data.ok || data.duplicateVariantGids.has(variantGid)) return FALLBACK

  const product = data.productsByGid.get(productGid)
  if (!product || product.hold) return FALLBACK

  const variant = product.variants[variantGid]
  if (!variant) return FALLBACK

  return buildDisplay(variant.public_display_class, product.display_copy)
}

export function resolveCardShippingDisplay(productGid: string): ShippingDisplay {
  const data = getShippingFactsData()
  if (!data.ok) return FALLBACK

  const product = data.productsByGid.get(productGid)
  if (!product || product.hold) return FALLBACK

  const classes = new Set(Object.values(product.variants).map((v) => v.public_display_class))
  if (classes.size !== 1) return FALLBACK

  const [sharedClass] = classes
  return buildDisplay(sharedClass, product.display_copy)
}

export function resolveVariantsForProduct(productGid: string): Record<string, ShippingDisplay> {
  const data = getShippingFactsData()
  const out: Record<string, ShippingDisplay> = {}
  if (!data.ok) return out

  const product = data.productsByGid.get(productGid)
  if (!product) return out

  for (const [variantGid, variant] of Object.entries(product.variants)) {
    out[variantGid] =
      product.hold || data.duplicateVariantGids.has(variantGid)
        ? FALLBACK
        : buildDisplay(variant.public_display_class, product.display_copy)
  }
  return out
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run lib/shipping-resolver/__tests__/resolve.test.ts
```

Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/shipping-resolver/resolve.ts lib/shipping-resolver/__tests__/resolve.test.ts
git commit -m "Add shipping display resolver (variant/card/bulk lookups)"
```

---

### Task 7: Feature flag helper

**Files:**
- Create: `lib/shipping-resolver/flag.ts`
- Test: `lib/shipping-resolver/__tests__/flag.test.ts`

**Interfaces:**
- Produces: `isShippingResolverEnabled(): boolean`. Tasks 8, 11, 12, 13 import this.

- [ ] **Step 1: Write the failing test**

Create `lib/shipping-resolver/__tests__/flag.test.ts`:

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest'
import { isShippingResolverEnabled } from '../flag'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isShippingResolverEnabled', () => {
  it('is disabled when the env var is unset', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', undefined as unknown as string)
    expect(isShippingResolverEnabled()).toBe(false)
  })

  it('is disabled for any value other than the literal string "true"', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'yes')
    expect(isShippingResolverEnabled()).toBe(false)
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', '1')
    expect(isShippingResolverEnabled()).toBe(false)
  })

  it('is enabled only when set to exactly "true"', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    expect(isShippingResolverEnabled()).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run lib/shipping-resolver/__tests__/flag.test.ts
```

Expected: FAIL — `Cannot find module '../flag'`.

- [ ] **Step 3: Write the helper**

Create `lib/shipping-resolver/flag.ts`:

```typescript
import 'server-only'

// Plain server-side env var (not NEXT_PUBLIC_) — the resolver only ever runs
// server-side; resolved display data crosses to the client as already-
// computed props, never as raw resolver access. Defaults to disabled on any
// unset/invalid value, so a missing var in any environment (including a
// misconfigured prod deploy) fails to disabled, never enabled.
export function isShippingResolverEnabled(): boolean {
  return process.env.SHIPPING_RESOLVER_ENABLED === 'true'
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/shipping-resolver/__tests__/flag.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/shipping-resolver/flag.ts lib/shipping-resolver/__tests__/flag.test.ts
git commit -m "Add shipping resolver feature flag helper"
```

---

### Task 8: Server-side attachment helpers (cards + cart)

**Files:**
- Create: `lib/shipping-resolver/attach.ts`
- Create: `lib/shipping-resolver/cart.ts`
- Test: `lib/shipping-resolver/__tests__/attach.test.ts`
- Test: `lib/shipping-resolver/__tests__/cart.test.ts`
- Modify: `lib/shopify/types.ts` (add `shippingDisplay` to `CollectionProduct` and `CartLine`)

**Interfaces:**
- Consumes: `resolveCardShippingDisplay`, `resolveVariantShippingDisplay`, `ShippingDisplay` from `./resolve` (Task 6); `isShippingResolverEnabled` from `./flag` (Task 7); `CollectionProduct`, `Cart` from `@/lib/shopify/types`.
- Produces: `attachCardShippingDisplay(products: CollectionProduct[]): CollectionProduct[]`, `attachCartShippingDisplay(cart: Cart): Cart`. Task 11 imports `attachCardShippingDisplay`; Task 13 imports `attachCartShippingDisplay`.

- [ ] **Step 1: Add `shippingDisplay` to the shared Shopify types**

In `lib/shopify/types.ts`, add the import at the top of the file (after the existing imports, or as the first line if there are none):

```typescript
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
```

Then modify `CollectionProduct` (find the existing declaration):

```typescript
export type CollectionProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  availableForSale: boolean;
  tags: string[];
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  images: { nodes: ProductImage[] };
  variants: { nodes: Pick<ProductVariant, 'id' | 'title' | 'price' | 'compareAtPrice' | 'availableForSale' | 'quantityAvailable'>[] };
  shippingDisplay?: ShippingDisplay | null;
};
```

And `CartLine`:

```typescript
export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    sku: string | null;
    selectedOptions: SelectedOption[];
    product: {
      id: string;
      title: string;
      handle: string;
      vendor: string;
      tags: string[];
      images: { nodes: ProductImage[] };
    };
  };
  cost: { totalAmount: Money };
  shippingDisplay?: ShippingDisplay | null;
};
```

- [ ] **Step 2: Verify the type-only change compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors (both fields are optional, so nothing that builds `CollectionProduct`/`CartLine` object literals today needs to change).

- [ ] **Step 3: Write the failing tests**

Create `lib/shipping-resolver/__tests__/attach.test.ts`:

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { __resetShippingFactsCacheForTests } from '../data'
import { attachCardShippingDisplay } from '../attach'
import type { CollectionProduct } from '@/lib/shopify/types'

const VALID_FIXTURE = join(__dirname, 'fixtures/valid-payload.json')
const VALID_CHECKSUM = '802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'

function stubProduct(id: string): CollectionProduct {
  return {
    id,
    title: 'Test',
    handle: 'test',
    vendor: 'Test Vendor',
    availableForSale: true,
    tags: [],
    priceRange: { minVariantPrice: { amount: '1.00', currencyCode: 'USD' } },
    images: { nodes: [] },
    variants: { nodes: [] },
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('attachCardShippingDisplay', () => {
  it('returns products unchanged when the flag is disabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'false')
    const products = [stubProduct('gid://shopify/Product/8651919917272')]
    const result = attachCardShippingDisplay(products)
    expect(result).toBe(products)
    expect(result[0].shippingDisplay).toBeUndefined()
  })

  it('attaches a resolved shippingDisplay to each product when the flag is enabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const products = [stubProduct('gid://shopify/Product/8651919917272')]
    const result = attachCardShippingDisplay(products)
    expect(result[0].shippingDisplay?.class).toBe('standard-free')
  })
})
```

Create `lib/shipping-resolver/__tests__/cart.test.ts`:

```typescript
import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { __resetShippingFactsCacheForTests } from '../data'
import { attachCartShippingDisplay } from '../cart'
import type { Cart } from '@/lib/shopify/types'

const VALID_FIXTURE = join(__dirname, 'fixtures/valid-payload.json')
const VALID_CHECKSUM = '802f0070e6c122f26afd465d2058f4de6b29dcdd4ec6e0e29e418e2474c47d53'

function stubCart(productId: string, variantId: string): Cart {
  return {
    id: 'gid://shopify/Cart/1',
    checkoutUrl: 'https://example.com/checkout',
    totalQuantity: 1,
    attributes: [],
    buyerIdentity: null,
    lines: {
      nodes: [
        {
          id: 'gid://shopify/CartLine/1',
          quantity: 1,
          merchandise: {
            id: variantId,
            title: 'Default Title',
            sku: 'SKU',
            selectedOptions: [],
            product: {
              id: productId,
              title: 'Test',
              handle: 'test',
              vendor: 'Test Vendor',
              tags: [],
              images: { nodes: [] },
            },
          },
          cost: { totalAmount: { amount: '1.00', currencyCode: 'USD' } },
        },
      ],
    },
    cost: {
      subtotalAmount: { amount: '1.00', currencyCode: 'USD' },
      totalAmount: { amount: '1.00', currencyCode: 'USD' },
      totalTaxAmount: null,
    },
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  __resetShippingFactsCacheForTests()
})

describe('attachCartShippingDisplay', () => {
  it('returns the cart unchanged when the flag is disabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'false')
    const cart = stubCart('gid://shopify/Product/8651919917272', 'gid://shopify/ProductVariant/46997871591640')
    const result = attachCartShippingDisplay(cart)
    expect(result).toBe(cart)
    expect(result.lines.nodes[0].shippingDisplay).toBeUndefined()
  })

  it('attaches a resolved shippingDisplay to each line when the flag is enabled', () => {
    vi.stubEnv('SHIPPING_RESOLVER_ENABLED', 'true')
    vi.stubEnv('SHIPPING_FACTS_PATH', VALID_FIXTURE)
    vi.stubEnv('SHIPPING_FACTS_CHECKSUM_SHA256', VALID_CHECKSUM)
    const cart = stubCart('gid://shopify/Product/8651919917272', 'gid://shopify/ProductVariant/46997871591640')
    const result = attachCartShippingDisplay(cart)
    expect(result.lines.nodes[0].shippingDisplay?.class).toBe('standard-free')
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npx vitest run lib/shipping-resolver/__tests__/attach.test.ts lib/shipping-resolver/__tests__/cart.test.ts
```

Expected: FAIL — `Cannot find module '../attach'` / `'../cart'`.

- [ ] **Step 5: Write the helpers**

Create `lib/shipping-resolver/attach.ts`:

```typescript
import 'server-only'
import type { CollectionProduct } from '@/lib/shopify/types'
import { resolveCardShippingDisplay } from './resolve'
import { isShippingResolverEnabled } from './flag'

export function attachCardShippingDisplay(products: CollectionProduct[]): CollectionProduct[] {
  if (!isShippingResolverEnabled()) return products
  return products.map((product) => ({
    ...product,
    shippingDisplay: resolveCardShippingDisplay(product.id),
  }))
}
```

Create `lib/shipping-resolver/cart.ts`:

```typescript
import 'server-only'
import type { Cart } from '@/lib/shopify/types'
import { resolveVariantShippingDisplay } from './resolve'
import { isShippingResolverEnabled } from './flag'

export function attachCartShippingDisplay(cart: Cart): Cart {
  if (!isShippingResolverEnabled()) return cart
  return {
    ...cart,
    lines: {
      nodes: cart.lines.nodes.map((line) => ({
        ...line,
        shippingDisplay: resolveVariantShippingDisplay(line.merchandise.product.id, line.merchandise.id),
      })),
    },
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx vitest run lib/shipping-resolver/__tests__/attach.test.ts lib/shipping-resolver/__tests__/cart.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/types.ts lib/shipping-resolver/attach.ts lib/shipping-resolver/cart.ts lib/shipping-resolver/__tests__/attach.test.ts lib/shipping-resolver/__tests__/cart.test.ts
git commit -m "Add server-side shippingDisplay attachment for cards and cart"
```

---

### Task 9: `ProductCardData` type extension

**Files:**
- Modify: `types/product.ts`

**Interfaces:**
- Consumes: `ShippingDisplay` from `@/lib/shipping-resolver/resolve`.
- Produces: `ProductCardData.shippingDisplay?: ShippingDisplay | null`. Task 11 sets this field; Task 10's `ShippingBadge` reads it via `ProductCardData` consumers.

- [ ] **Step 1: Add the import and field**

In `types/product.ts`, add the import at the top:

```typescript
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
```

Then in the `ProductCardData` interface, add the new field next to `hasFreeShipping`:

```typescript
export interface ProductCardData {
  handle: string
  title: string
  image: { url: string; altText: string; width: number; height: number }
  images?: { url: string; altText: string; width: number; height: number }[]
  brand: string
  vendor: string
  partnerVendor?: string
  price: number
  compareAtPrice?: number
  sku: string
  available: boolean
  leadTime?: string
  isOCC?: boolean
  hasFreeShipping?: boolean
  shippingDisplay?: ShippingDisplay | null
  isRx?: boolean
  variants: { id: string; title: string; price: number; compareAtPrice?: number; available: boolean }[]
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no new errors (the field is optional).

- [ ] **Step 3: Commit**

```bash
git add types/product.ts
git commit -m "Add optional shippingDisplay field to ProductCardData"
```

---

### Task 10: Shared UI components (`ShippingBadge`, `ShippingBlock`)

**Files:**
- Create: `components/product/ShippingBadge.tsx`
- Modify: `components/product/ShippingBlock.tsx` (currently dead code — repurposed here)
- Test: `components/product/__tests__/ShippingBadge.test.tsx`
- Test: `components/product/__tests__/ShippingBlock.test.tsx`

**Interfaces:**
- Consumes: `ShippingDisplay` from `@/lib/shipping-resolver/resolve`; `SHIPPING_CLASS_BADGE_LABEL` from `@/lib/shipping-resolver/copy`.
- Produces: `<ShippingBadge shippingDisplay={ShippingDisplay | null} className?: string />`, `<ShippingBlock shippingDisplay={ShippingDisplay | null} />`. Tasks 11–13 render these.

- [ ] **Step 1: Write the failing tests**

Create `components/product/__tests__/ShippingBadge.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShippingBadge } from '../ShippingBadge'
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

function display(overrides: Partial<ShippingDisplay> = {}): ShippingDisplay {
  return { class: 'standard-free', message: 'Free shipping', displayCopy: null, ...overrides }
}

describe('ShippingBadge', () => {
  it('renders nothing when shippingDisplay is null', () => {
    const { container } = render(<ShippingBadge shippingDisplay={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a "Free Shipping" badge for standard-free', () => {
    render(<ShippingBadge shippingDisplay={display({ class: 'standard-free' })} />)
    expect(screen.getByText('Free Shipping')).toBeInTheDocument()
  })

  it('renders a distinct badge for threshold (not the same label as free)', () => {
    render(<ShippingBadge shippingDisplay={display({ class: 'threshold' })} />)
    expect(screen.getByText('Free Shipping Available')).toBeInTheDocument()
    expect(screen.queryByText('Free Shipping')).not.toBeInTheDocument()
  })

  it('renders nothing for standard-paid', () => {
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'standard-paid' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for unknown — the 17 unsafe-FREE variants must never show a badge', () => {
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'unknown' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for manual-quote', () => {
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'manual-quote' })} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

Create `components/product/__tests__/ShippingBlock.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShippingBlock } from '../ShippingBlock'
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

describe('ShippingBlock', () => {
  it('renders nothing when shippingDisplay is null', () => {
    const { container } = render(<ShippingBlock shippingDisplay={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the fallback message for unknown', () => {
    render(
      <ShippingBlock
        shippingDisplay={{ class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null }}
      />,
    )
    expect(screen.getByText('Shipping calculated at checkout.')).toBeInTheDocument()
  })

  it('prefers displayCopy over message when both are present', () => {
    render(
      <ShippingBlock
        shippingDisplay={{
          class: 'standard-paid',
          message: 'Shipping calculated at checkout.',
          displayCopy: 'Vendor shipping is $45.95 on orders under $700 and $20.95 on orders of $700 or more. Final shipping is calculated at checkout.',
        }}
      />,
    )
    expect(
      screen.getByText(
        'Vendor shipping is $45.95 on orders under $700 and $20.95 on orders of $700 or more. Final shipping is calculated at checkout.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Shipping calculated at checkout.')).not.toBeInTheDocument()
  })

  it('never states an exact paid rate', () => {
    render(
      <ShippingBlock
        shippingDisplay={{ class: 'standard-paid', message: 'Shipping calculated at checkout.', displayCopy: null }}
      />,
    )
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run components/product/__tests__/ShippingBadge.test.tsx components/product/__tests__/ShippingBlock.test.tsx
```

Expected: FAIL — `Cannot find module '../ShippingBadge'` and `ShippingBlock` test failures (current `ShippingBlock` takes different props).

- [ ] **Step 3: Create `ShippingBadge.tsx`**

Create `components/product/ShippingBadge.tsx`:

```typescript
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
import { SHIPPING_CLASS_BADGE_LABEL } from '@/lib/shipping-resolver/copy'

interface Props {
  shippingDisplay: ShippingDisplay | null
  className?: string
}

export function ShippingBadge({ shippingDisplay, className = '' }: Props) {
  if (!shippingDisplay) return null
  const label = SHIPPING_CLASS_BADGE_LABEL[shippingDisplay.class]
  if (!label) return null

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-teal-500 text-white ${className}`}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Rewrite `ShippingBlock.tsx`**

Replace the full contents of `components/product/ShippingBlock.tsx`:

```typescript
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

interface Props {
  shippingDisplay: ShippingDisplay | null
}

export function ShippingBlock({ shippingDisplay }: Props) {
  if (!shippingDisplay) return null
  const text = shippingDisplay.displayCopy ?? shippingDisplay.message

  return (
    <section aria-labelledby="shipping-heading" className="border-t border-gray-200 pt-8">
      <h2 id="shipping-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Shipping
      </h2>
      <div className="bg-neutral-50 rounded-lg p-4 text-sm text-navy-900">
        {text}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run components/product/__tests__/ShippingBadge.test.tsx components/product/__tests__/ShippingBlock.test.tsx
```

Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add components/product/ShippingBadge.tsx components/product/ShippingBlock.tsx components/product/__tests__/ShippingBadge.test.tsx components/product/__tests__/ShippingBlock.test.tsx
git commit -m "Add ShippingBadge; repurpose dormant ShippingBlock for resolver output"
```

---

### Task 11: Wire product cards (category grid + quick-add)

**Files:**
- Modify: `components/category/CategoryResults.tsx`
- Modify: `components/store/ShopifyProductCard.tsx`
- Modify: `components/product/QuickAddContent.tsx`
- Modify: `components/store/ShopifyQuickAddButton.tsx`
- Modify: `components/home/PopularProducts.tsx`

**Interfaces:**
- Consumes: `attachCardShippingDisplay` from `@/lib/shipping-resolver/attach` (Task 8); `ShippingBadge` from `./ShippingBadge` (Task 10); `ProductCardData.shippingDisplay` (Task 9); `CollectionProduct.shippingDisplay` (Task 8).

- [ ] **Step 1: Attach shipping display at the category-grid fetch site**

In `components/category/CategoryResults.tsx`, add the import near the other `@/lib` imports:

```typescript
import { attachCardShippingDisplay } from '@/lib/shipping-resolver/attach'
```

Find this existing line (in the section building `products` from `allNodes`):

```typescript
  const products = allNodes.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE)
```

Replace it with:

```typescript
  const products = attachCardShippingDisplay(allNodes.slice(startIndex, startIndex + CATEGORY_PAGE_SIZE))
```

- [ ] **Step 2: Replace the inline tag-based badge in `ShopifyProductCard.tsx`**

Add the import:

```typescript
import { ShippingBadge } from '@/components/product/ShippingBadge'
```

Replace this block:

```typescript
        {(product.tags.includes('free-shipping') || product.tags.includes('rx-required')) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.tags.includes('free-shipping') && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-teal-500 text-white">
                Free Shipping
              </span>
            )}
            {product.tags.includes('rx-required') && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-amber-600 text-white">
                RX Only
              </span>
            )}
          </div>
        )}
```

with:

```typescript
        {(product.shippingDisplay || product.tags.includes('free-shipping') || product.tags.includes('rx-required')) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.shippingDisplay ? (
              <ShippingBadge shippingDisplay={product.shippingDisplay} />
            ) : (
              product.tags.includes('free-shipping') && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-teal-500 text-white">
                  Free Shipping
                </span>
              )
            )}
            {product.tags.includes('rx-required') && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-amber-600 text-white">
                RX Only
              </span>
            )}
          </div>
        )}
```

- [ ] **Step 3: Copy `shippingDisplay` through both `toCardData` mappers**

In `components/store/ShopifyQuickAddButton.tsx`, in the `toCardData` return object, add the field right after `hasFreeShipping`:

```typescript
    hasFreeShipping: product.tags.includes('free-shipping'),
    shippingDisplay: product.shippingDisplay ?? null,
```

In `components/home/PopularProducts.tsx`, in its `toCardData` return object, make the identical change:

```typescript
    hasFreeShipping: product.tags.includes('free-shipping'),
    shippingDisplay: product.shippingDisplay ?? null,
```

(`PopularProducts` products are not run through `attachCardShippingDisplay` — this plan does not wire the homepage fetch, so `product.shippingDisplay` will simply be `undefined` there, and `?? null` keeps `QuickAddContent` on its existing tag-based behavior for that surface. This is intentional — see the plan's Context section.)

- [ ] **Step 4: Replace the inline badge in `QuickAddContent.tsx`**

Add the import:

```typescript
import { ShippingBadge } from '@/components/product/ShippingBadge'
```

Replace:

```typescript
        {product.hasFreeShipping && (
          <div className="absolute top-4 left-4 bg-[#006e46] px-3 py-1.5">
            <span className="text-[#f9faf9] text-[13px] font-bold leading-[28px] tracking-[0.26px]">
              FREE SHIPPING
            </span>
          </div>
        )}
```

with:

```typescript
        {product.shippingDisplay ? (
          <div className="absolute top-4 left-4">
            <ShippingBadge shippingDisplay={product.shippingDisplay} className="px-3 py-1.5 text-[13px] font-bold" />
          </div>
        ) : (
          product.hasFreeShipping && (
            <div className="absolute top-4 left-4 bg-[#006e46] px-3 py-1.5">
              <span className="text-[#f9faf9] text-[13px] font-bold leading-[28px] tracking-[0.26px]">
                FREE SHIPPING
              </span>
            </div>
          )
        )}
```

- [ ] **Step 5: Type-check and run the full test suite**

```bash
npx tsc --noEmit
npm test
```

Expected: no new type errors; all existing tests still pass (nothing behavioral changed while the flag is off — verified in Task 14).

- [ ] **Step 6: Commit**

```bash
git add components/category/CategoryResults.tsx components/store/ShopifyProductCard.tsx components/product/QuickAddContent.tsx components/store/ShopifyQuickAddButton.tsx components/home/PopularProducts.tsx
git commit -m "Wire resolver-driven shipping badge into category grid and quick-add"
```

---

### Task 12: Wire the PDP

**Files:**
- Modify: `app/product/[slug]/page.tsx`
- Modify: `components/product/ProductView.tsx`

**Interfaces:**
- Consumes: `resolveVariantsForProduct` from `@/lib/shipping-resolver/resolve` (Task 6); `isShippingResolverEnabled` from `@/lib/shipping-resolver/flag` (Task 7); `ShippingBadge`, `ShippingBlock` from Task 10.

- [ ] **Step 1: Resolve per-variant shipping display in the page**

In `app/product/[slug]/page.tsx`, add the imports:

```typescript
import { resolveVariantsForProduct } from '@/lib/shipping-resolver/resolve'
import { isShippingResolverEnabled } from '@/lib/shipping-resolver/flag'
```

Find this line:

```typescript
  const relatedProducts = recsData.related
```

Add immediately before it:

```typescript
  const variantShippingDisplays = isShippingResolverEnabled()
    ? resolveVariantsForProduct(product.id)
    : {}
```

Then find the `<ProductView` call and add the new prop:

```typescript
      <ProductView
        product={product}
        relatedProducts={relatedProducts}
        complementaryProducts={complementaryProducts}
        breadcrumbs={categoryCrumbs}
        partnerSlug={partner?.slug ?? null}
        variantShippingDisplays={variantShippingDisplays}
      />
```

- [ ] **Step 2: Accept the prop and resolve the selected variant's display in `ProductView.tsx`**

Add the imports:

```typescript
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'
import { ShippingBadge } from './ShippingBadge'
import { ShippingBlock } from './ShippingBlock'
```

Update the `Props` interface:

```typescript
interface Props {
  product: Product
  relatedProducts: CollectionProduct[]
  complementaryProducts: CollectionProduct[]
  breadcrumbs?: BreadcrumbItem[]
  partnerSlug?: string | null
  variantShippingDisplays?: Record<string, ShippingDisplay>
}
```

Update the function signature:

```typescript
export function ProductView({ product, relatedProducts, complementaryProducts, breadcrumbs, partnerSlug, variantShippingDisplays = {} }: Props) {
```

Add this line after `selectedVariant` is derived (right after the `useState<ProductVariant>` line):

```typescript
  const shippingDisplay = variantShippingDisplays[selectedVariant.id] ?? null
```

- [ ] **Step 3: Replace the free-shipping portion of the inline badge block**

Replace:

```typescript
            {/* Product badges — metafield/tag gated */}
            {(product.tags.includes('free-shipping') || product.tags.includes('rx-required')) && (
              <div className="flex flex-wrap gap-2">
                {product.tags.includes('free-shipping') && (
                  <span className="inline-flex items-center px-3 py-1 text-[13px] font-medium rounded bg-teal-500 text-white">
                    Free Shipping
                  </span>
                )}
                {product.tags.includes('rx-required') && (
                  <span className="inline-flex items-center px-3 py-1 text-[13px] font-medium rounded bg-amber-600 text-white">
                    RX Only
                  </span>
                )}
              </div>
            )}
```

with:

```typescript
            {/* Product badges — resolver-driven when the flag is on, tag-gated otherwise */}
            {(shippingDisplay || product.tags.includes('free-shipping') || product.tags.includes('rx-required')) && (
              <div className="flex flex-wrap gap-2">
                {shippingDisplay ? (
                  <ShippingBadge shippingDisplay={shippingDisplay} className="px-3 py-1 text-[13px]" />
                ) : (
                  product.tags.includes('free-shipping') && (
                    <span className="inline-flex items-center px-3 py-1 text-[13px] font-medium rounded bg-teal-500 text-white">
                      Free Shipping
                    </span>
                  )
                )}
                {product.tags.includes('rx-required') && (
                  <span className="inline-flex items-center px-3 py-1 text-[13px] font-medium rounded bg-amber-600 text-white">
                    RX Only
                  </span>
                )}
              </div>
            )}
```

- [ ] **Step 4: Render the full shipping message section**

Find the closing of the hero `<section>` (the line `      </section>` that immediately precedes the `{/* Tabs */}` comment) and insert the shipping block between them:

```typescript
      </section>

      {shippingDisplay && (
        <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
          <ShippingBlock shippingDisplay={shippingDisplay} />
        </div>
      )}

      {/* Tabs */}
```

- [ ] **Step 5: Type-check and run the full test suite**

```bash
npx tsc --noEmit
npm test
```

Expected: no new type errors; all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add app/product/\[slug\]/page.tsx components/product/ProductView.tsx
git commit -m "Wire resolver-driven shipping badge and message into PDP"
```

---

### Task 13: Wire the cart (drawer + full cart page)

**Files:**
- Modify: `app/actions/cart.ts`
- Modify: `components/store/CartPopup.tsx`
- Modify: `components/store/CartPageClient.tsx`

**Interfaces:**
- Consumes: `attachCartShippingDisplay` from `@/lib/shipping-resolver/cart` (Task 8); `ShippingBadge` from Task 10; `CartLine.shippingDisplay` (Task 8).

- [ ] **Step 1: Attach shipping display to every cart-returning server action**

In `app/actions/cart.ts`, add the import:

```typescript
import { attachCartShippingDisplay } from '@/lib/shipping-resolver/cart'
```

Wrap each `Cart`-returning statement. `getCart`:

```typescript
export async function getCart(): Promise<Cart | null> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value
  if (!cartId) return null
  try {
    const data = await storefrontFetch<{ cart: Cart | null }>(GET_CART, { cartId }, NO_STORE)
    return data.cart ? attachCartShippingDisplay(data.cart) : null
  } catch (err) {
    console.error('[getCart] failed:', err)
    return null
  }
}
```

`createCart` (internal helper — both `addToCart` call sites flow through this, so wrapping it here is sufficient for `addToCart` too):

```typescript
async function createCart(variantId: string, quantity: number): Promise<Cart> {
  const jar = await cookies()
  const data = await storefrontFetch<{ cartCreate: { cart: Cart; userErrors: UserError[] } }>(
    CREATE_CART,
    { lines: [{ merchandiseId: variantId, quantity }] },
    NO_STORE,
  )
  assertNoUserErrors(data.cartCreate.userErrors, 'cartCreate')
  const cart = data.cartCreate.cart
  jar.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return attachCartShippingDisplay(cart)
}
```

`addToCart`'s remaining direct return (the try branch):

```typescript
    assertNoUserErrors(data.cartLinesAdd.userErrors, 'cartLinesAdd')
    return attachCartShippingDisplay(data.cartLinesAdd.cart)
```

`updateCartLine`:

```typescript
  assertNoUserErrors(data.cartLinesUpdate.userErrors, 'cartLinesUpdate')
  return attachCartShippingDisplay(data.cartLinesUpdate.cart)
```

`removeFromCart`:

```typescript
  assertNoUserErrors(data.cartLinesRemove.userErrors, 'cartLinesRemove')
  return attachCartShippingDisplay(data.cartLinesRemove.cart)
```

`setCartAttribute`:

```typescript
  assertNoUserErrors(data.cartAttributesUpdate.userErrors, 'cartAttributesUpdate')
  return attachCartShippingDisplay(data.cartAttributesUpdate.cart)
```

- [ ] **Step 2: Render a per-line badge in `CartPopup.tsx`**

Add the import:

```typescript
import { ShippingBadge } from '@/components/product/ShippingBadge'
```

Find this block (inside the `lines.map` render):

```typescript
                      {variantTitle !== 'Default Title' && (
                        <p className="text-gray-500 text-[12px] tracking-[0.24px] mb-3">
                          {variantTitle}
                        </p>
                      )}
```

Replace it with:

```typescript
                      {variantTitle !== 'Default Title' && (
                        <p className="text-gray-500 text-[12px] tracking-[0.24px] mb-1">
                          {variantTitle}
                        </p>
                      )}
                      {line.shippingDisplay && (
                        <div className="mb-2">
                          <ShippingBadge shippingDisplay={line.shippingDisplay} />
                        </div>
                      )}
```

- [ ] **Step 3: Render the same per-line badge in `CartPageClient.tsx`**

Add the same import:

```typescript
import { ShippingBadge } from '@/components/product/ShippingBadge'
```

Find:

```typescript
                  {variantTitle !== 'Default Title' && (
                    <p className="text-gray-500 text-[12px] tracking-[0.24px]">{variantTitle}</p>
                  )}
```

Replace it with:

```typescript
                  {variantTitle !== 'Default Title' && (
                    <p className="text-gray-500 text-[12px] tracking-[0.24px]">{variantTitle}</p>
                  )}
                  {line.shippingDisplay && (
                    <div className="mt-1">
                      <ShippingBadge shippingDisplay={line.shippingDisplay} />
                    </div>
                  )}
```

- [ ] **Step 4: Type-check and run the full test suite**

```bash
npx tsc --noEmit
npm test
```

Expected: no new type errors; all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add app/actions/cart.ts components/store/CartPopup.tsx components/store/CartPageClient.tsx
git commit -m "Wire resolver-driven shipping badge into cart drawer and full cart"
```

---

### Task 14: Final verification (flag-off regression, full suite, QA evidence)

**Files:**
- None created — verification only.

- [ ] **Step 1: Run the full automated suite**

```bash
npm run lint
npx tsc --noEmit
npm test
```

Expected: all three pass with zero errors.

- [ ] **Step 2: Confirm the flag is off by default (no env var set)**

```bash
grep -n "SHIPPING_RESOLVER_ENABLED" .env.example
grep -n "SHIPPING_RESOLVER_ENABLED" .env.local 2>/dev/null || echo "no .env.local override present"
node -e "console.log('isShippingResolverEnabled() would return:', process.env.SHIPPING_RESOLVER_ENABLED === 'true')"
```

Expected: `.env.example` shows the var commented out (`# SHIPPING_RESOLVER_ENABLED=`); the `.env.local` check prints either no match or "no .env.local override present"; the last line prints `false`. If `.env.local` has `SHIPPING_RESOLVER_ENABLED=true` uncommented, unset it — the flag must ship disabled.

- [ ] **Step 3: Manual flag-off smoke test**

```bash
npm run dev
```

With `SHIPPING_RESOLVER_ENABLED` unset, in a browser:
- Visit a category page and confirm product cards render exactly as before (tag-based "Free Shipping"/"RX Only" badges only, no resolver-driven badges).
- Open a quick-add modal and confirm its badge is unchanged.
- Visit a PDP and confirm the badge row and page layout are unchanged, with no new "Shipping" section appearing.
- Open the cart drawer and full cart page and confirm no per-line shipping badges appear.

Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Manual flag-on smoke test**

Set `SHIPPING_RESOLVER_ENABLED=true` in `.env.local` (do not commit this), restart:

```bash
npm run dev
```

- Visit a category page containing `3.2mm, 3-Piece Resin Disposable Trocar Only (B6819)` (handle `3-2mm-3-piece-resin-disposable-trocar-only-b6819`) if it's in the live catalog, or any product, and confirm cards show resolver-driven badges (or none, silently) instead of tag-based ones.
- Visit the PDP for a product and confirm the new "Shipping" section renders the correct message for its class, and never an exact dollar rate.
- Add an item to cart and confirm the cart drawer/full cart show a badge only when the resolved class supports one.

Unset `SHIPPING_RESOLVER_ENABLED` (or remove it from `.env.local`) afterward so local dev matches the production-disabled default. Stop the dev server.

- [ ] **Step 5: Record QA evidence in the ticket**

Update the ticket's "📸 QA / handoff evidence" section (or a linked tracking doc, per team convention) with:
- Resolver schema and unit test output: paste the `npm test` output for `lib/shipping-resolver/__tests__/*`.
- Confirmation the flag is disabled in the committed `.env.example` (Step 2 output).
- Written confirmation that no Shopify production rates, profiles, or locations were changed: this plan made no Admin API or delivery-profile writes — confirm by noting no new Admin API calls were added (`grep -rn "SHOPIFY_ADMIN_ACCESS_TOKEN" lib/shipping-resolver/` should return nothing).

- [ ] **Step 6: Final commit (if Step 5 produced any doc changes)**

```bash
git add -A
git status --short
git commit -m "DEV-SHIP-01: record QA evidence for shipping display resolver"
```

(Skip this commit if Step 5 was recorded outside the repo, e.g. in an external ticket tracker.)

---

## Known gaps (explicitly out of scope for this plan)

- Homepage sections (`HeroSection.tsx`, `PopularProducts.tsx`'s own card, not its quick-add modal), search results, partner pages, and industry pages are not wired to `attachCardShippingDisplay` — they show no free-shipping badge today and continue not to. Wiring them follows the identical pattern established in Task 11 (call `attachCardShippingDisplay` at their `CollectionProduct[]` fetch site) if a future ticket wants it.
- Fordeer §8.3 precedence: no code, per the design doc — Fordeer has no runtime footprint on this headless frontend (`docs/t5-post-launch-removal.md`).
- Freight, Canada restriction enforcement, hold enforcement beyond claim-suppression, delivery-profile/rate/location/Markets changes, and `custom.free_shipping` metafield cleanup remain unimplemented, per the ticket.
