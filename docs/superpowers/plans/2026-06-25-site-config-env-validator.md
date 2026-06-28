# Site Config + Server Env Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single `lib/site-config.ts` module for the canonical origin and public IDs, and a server-only `lib/env.server.ts` that throws with an actionable message at startup when any required env var is missing — eliminating duplicated `SITE_URL` reads and silent `undefined` URL construction.

**Architecture:** `lib/site-config.ts` (no server guard, importable anywhere) holds public constants derived from `NEXT_PUBLIC_*` vars and non-secret Shopify OAuth values. `lib/env.server.ts` (`server-only`) holds a module-level `serverEnv` object that validates all secrets at first import. `instrumentation.ts` at the project root imports both at boot time so the server crashes with a named error before handling any requests.

**Tech Stack:** Next.js 16.2.6 (App Router), TypeScript, Vitest, `server-only` package

## Global Constraints

- TypeScript strict mode — no `!` non-null assertions on env reads; use `serverEnv` or a default instead
- `server-only` must appear as the first import in `lib/env.server.ts`
- Error messages must match the template exactly: `[env] Missing required server variable: <VAR_NAME>. Check .env.local (dev) or your deployment environment (prod).`
- No URL may contain a bare `undefined` or `null` segment
- All existing 244 tests must continue to pass after each task
- Commit after every task
- Test runner: `npx vitest run` — never use `--watch`

---

## File Map

| File | Action | Responsibility after change |
|---|---|---|
| `lib/site-config.ts` | Create | Public constants: `SITE_ORIGIN`, `SITE_NAME`, Customer Account public vars |
| `lib/env.server.ts` | Create | Validated `serverEnv` object, server-only secrets |
| `instrumentation.ts` | Create | Boot-time import of both modules to force early failure |
| `lib/seo/constants.ts` | Modify | Re-export shim: `SITE_URL`, `SITE_NAME` + SEO-derived constants |
| `lib/shopify/storefront.ts` | Modify | Use `serverEnv` for domain + token |
| `lib/shopify/admin.ts` | Modify | Use `serverEnv` for domain + token |
| `lib/shopify/customer.ts` | Modify | Use `site-config` for public OAuth vars + `SITE_ORIGIN` |
| `lib/resend.ts` | Modify | Use `serverEnv` for API key + email addresses |
| `app/api/auth/callback/route.ts` | Modify | Import `SITE_ORIGIN` from `site-config` |
| `app/api/auth/refresh/route.ts` | Modify | Import `SITE_ORIGIN` from `site-config` |
| `app/api/auth/logout/route.ts` | Modify | Import `SITE_ORIGIN` from `site-config` |
| `app/api/bunny/[...path]/route.ts` | Modify | Use `serverEnv` for BunnyCDN vars |
| `lib/__tests__/site-config.test.ts` | Create | Tests for `SITE_ORIGIN` stripping + fallback |
| `lib/__tests__/env.server.test.ts` | Create | Tests for required/optional var validation |
| `lib/shopify/__tests__/storefront-cache.test.ts` | Modify | Add `vi.resetModules()` for module isolation |
| `app/api/bunny/[...path]/__tests__/route.test.ts` | Modify | Mock `@/lib/env.server`; remove "missing vars → 404" test |

---

## Task 1: Create `lib/site-config.ts`

**Files:**
- Create: `lib/site-config.ts`
- Create: `lib/__tests__/site-config.test.ts`

**Interfaces:**
- Produces:
  - `SITE_NAME: 'MDSupplies'`
  - `SITE_ORIGIN: string` — canonical `https://` origin, trailing slash stripped
  - `SHOPIFY_CUSTOMER_ACCOUNT_URL: string` — OAuth base URL (empty string if not set)
  - `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: string` — public OAuth client ID (empty string if not set)

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/site-config.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('SITE_NAME', () => {
  it('is MDSupplies', async () => {
    const { SITE_NAME } = await import('@/lib/site-config')
    expect(SITE_NAME).toBe('MDSupplies')
  })
})

describe('SITE_ORIGIN', () => {
  it('falls back to the production URL when NEXT_PUBLIC_SITE_URL is not set', async () => {
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://mdsupplies.com')
  })

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dev.example.com')
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://dev.example.com')
  })

  it('strips a trailing slash from NEXT_PUBLIC_SITE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dev.example.com/')
    const { SITE_ORIGIN } = await import('@/lib/site-config')
    expect(SITE_ORIGIN).toBe('https://dev.example.com')
  })
})

describe('Customer Account public vars', () => {
  it('returns empty string for SHOPIFY_CUSTOMER_ACCOUNT_URL when not set', async () => {
    const { SHOPIFY_CUSTOMER_ACCOUNT_URL } = await import('@/lib/site-config')
    expect(SHOPIFY_CUSTOMER_ACCOUNT_URL).toBe('')
  })

  it('returns the value of SHOPIFY_CUSTOMER_ACCOUNT_URL when set', async () => {
    vi.stubEnv('SHOPIFY_CUSTOMER_ACCOUNT_URL', 'https://shopify.com/authentication/123')
    const { SHOPIFY_CUSTOMER_ACCOUNT_URL } = await import('@/lib/site-config')
    expect(SHOPIFY_CUSTOMER_ACCOUNT_URL).toBe('https://shopify.com/authentication/123')
  })

  it('returns the value of SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID when set', async () => {
    vi.stubEnv('SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID', 'abc-uuid')
    const { SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID } = await import('@/lib/site-config')
    expect(SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID).toBe('abc-uuid')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run lib/__tests__/site-config.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/site-config'"

- [ ] **Step 3: Create `lib/site-config.ts`**

```ts
// lib/site-config.ts
export const SITE_NAME = 'MDSupplies' as const

export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
).replace(/\/$/, '')

export const SHOPIFY_CUSTOMER_ACCOUNT_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL ?? ''

export const SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID ?? ''
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run lib/__tests__/site-config.test.ts
```

Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/site-config.ts lib/__tests__/site-config.test.ts
git commit -m "feat: add lib/site-config for canonical origin and public OAuth IDs"
```

---

## Task 2: Create `lib/env.server.ts`

**Files:**
- Create: `lib/env.server.ts`
- Create: `lib/__tests__/env.server.test.ts`

**Interfaces:**
- Consumes: `server-only` package (already installed as a Next.js dependency)
- Produces:
  ```ts
  export const serverEnv: {
    shopifyStoreDomain: string       // SHOPIFY_STORE_DOMAIN
    shopifyStorefrontToken: string   // SHOPIFY_STOREFRONT_ACCESS_TOKEN
    shopifyAdminToken: string        // SHOPIFY_ADMIN_ACCESS_TOKEN
    resendApiKey: string             // RESEND_API_KEY
    resendFromEmail: string          // RESEND_FROM_EMAIL (default: 'noreply@mdsupplies.com')
    resendToEmail: string            // RESEND_TO_EMAIL (default: 'team@mdsupplies.com')
    bunnyCdnAccessKey: string        // BUNNYCDN_STORAGE_ACCESS_KEY
    bunnyCdnHostname: string         // BUNNYCDN_STORAGE_HOSTNAME (default: 'ny.storage.bunnycdn.com')
    bunnyCdnZone: string             // BUNNYCDN_STORAGE_ZONE (default: 'md-supplies')
  }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/env.server.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// All required vars — every test that imports env.server must have these set
const REQUIRED: Record<string, string> = {
  SHOPIFY_STORE_DOMAIN: 'test.myshopify.com',
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'sf-token',
  SHOPIFY_ADMIN_ACCESS_TOKEN: 'admin-token',
  RESEND_API_KEY: 're_test',
  BUNNYCDN_STORAGE_ACCESS_KEY: 'bunny-key',
}

function stubRequired(omit?: string) {
  for (const [k, v] of Object.entries(REQUIRED)) {
    if (k !== omit) vi.stubEnv(k, v)
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('serverEnv — happy path', () => {
  it('returns all required vars when set', async () => {
    stubRequired()
    const { serverEnv } = await import('@/lib/env.server')
    expect(serverEnv.shopifyStoreDomain).toBe('test.myshopify.com')
    expect(serverEnv.shopifyStorefrontToken).toBe('sf-token')
    expect(serverEnv.shopifyAdminToken).toBe('admin-token')
    expect(serverEnv.resendApiKey).toBe('re_test')
    expect(serverEnv.bunnyCdnAccessKey).toBe('bunny-key')
  })

  it('uses fallback for optional vars when not set', async () => {
    stubRequired()
    const { serverEnv } = await import('@/lib/env.server')
    expect(serverEnv.resendFromEmail).toBe('noreply@mdsupplies.com')
    expect(serverEnv.resendToEmail).toBe('team@mdsupplies.com')
    expect(serverEnv.bunnyCdnHostname).toBe('ny.storage.bunnycdn.com')
    expect(serverEnv.bunnyCdnZone).toBe('md-supplies')
  })

  it('uses set values for optional vars', async () => {
    stubRequired()
    vi.stubEnv('RESEND_FROM_EMAIL', 'custom@example.com')
    vi.stubEnv('BUNNYCDN_STORAGE_ZONE', 'my-zone')
    const { serverEnv } = await import('@/lib/env.server')
    expect(serverEnv.resendFromEmail).toBe('custom@example.com')
    expect(serverEnv.bunnyCdnZone).toBe('my-zone')
  })
})

describe('serverEnv — missing required vars', () => {
  it.each([
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
    'SHOPIFY_ADMIN_ACCESS_TOKEN',
    'RESEND_API_KEY',
    'BUNNYCDN_STORAGE_ACCESS_KEY',
  ])('throws for missing %s', async (varName) => {
    stubRequired(varName)
    await expect(import('@/lib/env.server')).rejects.toThrow(
      `[env] Missing required server variable: ${varName}. Check .env.local (dev) or your deployment environment (prod).`
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npx vitest run lib/__tests__/env.server.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/env.server'"

- [ ] **Step 3: Create `lib/env.server.ts`**

```ts
// lib/env.server.ts
import 'server-only'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(
    `[env] Missing required server variable: ${name}. Check .env.local (dev) or your deployment environment (prod).`
  )
  return v
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback
}

export const serverEnv = {
  shopifyStoreDomain:     required('SHOPIFY_STORE_DOMAIN'),
  shopifyStorefrontToken: required('SHOPIFY_STOREFRONT_ACCESS_TOKEN'),
  shopifyAdminToken:      required('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  resendApiKey:           required('RESEND_API_KEY'),
  resendFromEmail:        optional('RESEND_FROM_EMAIL', 'noreply@mdsupplies.com'),
  resendToEmail:          optional('RESEND_TO_EMAIL', 'team@mdsupplies.com'),
  bunnyCdnAccessKey:      required('BUNNYCDN_STORAGE_ACCESS_KEY'),
  bunnyCdnHostname:       optional('BUNNYCDN_STORAGE_HOSTNAME', 'ny.storage.bunnycdn.com'),
  bunnyCdnZone:           optional('BUNNYCDN_STORAGE_ZONE', 'md-supplies'),
} as const
```

- [ ] **Step 4: Run tests — verify they pass**

```
npx vitest run lib/__tests__/env.server.test.ts
```

Expected: 8 tests pass (3 happy path + 5 missing-var cases)

- [ ] **Step 5: Run full suite — verify no regressions**

```
npx vitest run
```

Expected: 244+ tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/env.server.ts lib/__tests__/env.server.test.ts
git commit -m "feat: add lib/env.server with startup-validated serverEnv object"
```

---

## Task 3: Create `instrumentation.ts`

**Files:**
- Create: `instrumentation.ts` (project root, alongside `next.config.ts`)

**Interfaces:**
- Consumes: `lib/env.server` (imports at boot to force evaluation), `lib/site-config` (to assert Customer Account vars)
- Produces: exported `register` function (Next.js boot hook)

- [ ] **Step 1: Create `instrumentation.ts`**

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env.server')

    const { SHOPIFY_CUSTOMER_ACCOUNT_URL, SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID } =
      await import('./lib/site-config')

    if (!SHOPIFY_CUSTOMER_ACCOUNT_URL)
      throw new Error(
        '[env] Missing required server variable: SHOPIFY_CUSTOMER_ACCOUNT_URL. Check .env.local (dev) or your deployment environment (prod).'
      )
    if (!SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID)
      throw new Error(
        '[env] Missing required server variable: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID. Check .env.local (dev) or your deployment environment (prod).'
      )
  }
}
```

- [ ] **Step 2: Run full suite — verify no regressions**

```
npx vitest run
```

Expected: 244+ tests pass (instrumentation.ts is not auto-imported by the test runner)

- [ ] **Step 3: Commit**

```bash
git add instrumentation.ts
git commit -m "feat: add instrumentation.ts for startup env validation"
```

---

## Task 4: Migrate `lib/seo/constants.ts` to re-export shim

**Files:**
- Modify: `lib/seo/constants.ts`

**Interfaces:**
- Consumes: `SITE_ORIGIN`, `SITE_NAME` from `lib/site-config`; `GLOBAL_PRODUCT_PLACEHOLDER` from `lib/bunnycdn` (unchanged)
- Produces: same named exports as before — `SITE_URL`, `SITE_NAME`, `DEFAULT_OG_IMAGE`, `OG_IMAGE_WIDTH`, `OG_IMAGE_HEIGHT`, `DEFAULT_TITLE`, `DEFAULT_DESCRIPTION` — all downstream imports are zero-churn

- [ ] **Step 1: Replace `lib/seo/constants.ts`**

```ts
// lib/seo/constants.ts
import { GLOBAL_PRODUCT_PLACEHOLDER } from '@/lib/bunnycdn'
import { SITE_ORIGIN, SITE_NAME } from '@/lib/site-config'

export { SITE_ORIGIN as SITE_URL, SITE_NAME }

export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${GLOBAL_PRODUCT_PLACEHOLDER}`

export const OG_IMAGE_WIDTH = 1200 as const
export const OG_IMAGE_HEIGHT = 630 as const

export const DEFAULT_TITLE = `${SITE_NAME} — Medical & Dental Supplies`

export const DEFAULT_DESCRIPTION =
  'Medical-grade supplies at wholesale prices. Trusted by urgent care centers, HRT clinics, home health agencies, and first responders.'
```

- [ ] **Step 2: Run all SEO tests**

```
npx vitest run lib/seo/__tests__
```

Expected: all existing SEO tests pass (canonical, sitemap, metadata, robots, robots-config)

- [ ] **Step 3: Run full suite**

```
npx vitest run
```

Expected: 244+ tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/seo/constants.ts
git commit -m "refactor: constants.ts re-exports SITE_URL/SITE_NAME from site-config"
```

---

## Task 5: Migrate Shopify libs

**Files:**
- Modify: `lib/shopify/storefront.ts`
- Modify: `lib/shopify/admin.ts`
- Modify: `lib/shopify/customer.ts`
- Modify: `lib/shopify/__tests__/storefront-cache.test.ts`

**Interfaces:**
- Consumes:
  - `serverEnv.shopifyStoreDomain`, `serverEnv.shopifyStorefrontToken` from `lib/env.server`
  - `serverEnv.shopifyAdminToken` from `lib/env.server`
  - `SITE_ORIGIN`, `SHOPIFY_CUSTOMER_ACCOUNT_URL`, `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` from `lib/site-config`

- [ ] **Step 1: Update `lib/shopify/storefront.ts`**

Replace the two inline `process.env` reads with `serverEnv`:

```ts
// lib/shopify/storefront.ts
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { ShopifyResponse } from './types';
import { loadEnvConfig } from '@next/env';
import { serverEnv } from '@/lib/env.server';

loadEnvConfig(process.cwd());
const STOREFRONT_API_URL = `https://${serverEnv.shopifyStoreDomain}/api/2026-04/graphql.json`;

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
    'X-Shopify-Storefront-Access-Token': serverEnv.shopifyStorefrontToken,
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

- [ ] **Step 2: Update `lib/shopify/admin.ts`**

```ts
// lib/shopify/admin.ts
import 'server-only';
import type { ShopifyResponse } from './types';
import { serverEnv } from '@/lib/env.server';

const ADMIN_API_URL = `https://${serverEnv.shopifyStoreDomain}/admin/api/2026-04/graphql.json`;

export async function adminFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': serverEnv.shopifyAdminToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Admin API HTTP ${res.status}: ${res.statusText}`);
  }

  const json: ShopifyResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  return json.data;
}
```

- [ ] **Step 3: Update `lib/shopify/customer.ts`**

Replace `authBase()`, `process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!`, and `process.env.NEXT_PUBLIC_SITE_URL` reads:

```ts
// lib/shopify/customer.ts
import type { ShopifyResponse } from './types';
import {
  SITE_ORIGIN,
  SHOPIFY_CUSTOMER_ACCOUNT_URL,
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
} from '@/lib/site-config';

const CUSTOMER_API_VERSION = '2026-04';

function authBase(): string {
  return SHOPIFY_CUSTOMER_ACCOUNT_URL;
}

function apiBase(): string {
  return authBase().replace('/authentication', '');
}

function customerApiUrl(): string {
  return `${apiBase()}/account/customer/api/${CUSTOMER_API_VERSION}/graphql`;
}

function tokenUrl(): string {
  return `${authBase()}/oauth/token`;
}

function authorizeUrl(): string {
  return `${authBase()}/oauth/authorize`;
}

export function logoutUrl(): string {
  return `${authBase()}/logout`;
}

function base64UrlEncode(input: Uint8Array): string {
  let str = '';
  for (const byte of input) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${SITE_ORIGIN}/api/auth/callback`,
    scope: 'openid email customer-account-api:full',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${authorizeUrl()}?${params}`;
}

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
    redirect_uri: `${SITE_ORIGIN}/api/auth/callback`,
    code,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function refreshAccessToken(token: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
    refresh_token: token,
  });

  const res = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function customerFetch<T>(
  query: string,
  accessToken: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = customerApiUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(
      `[customerFetch] HTTP ${res.status} ${res.statusText}\n  url:   ${url}\n  token: ${accessToken?.slice(0, 9)}… (len ${accessToken?.length})\n  body:  ${body.slice(0, 600)}`,
    );
    throw new Error(`Customer API HTTP ${res.status}: ${res.statusText}`);
  }

  const json: ShopifyResponse<T> = await res.json();

  if (json.errors?.length) {
    console.error(`[customerFetch] GraphQL errors @ ${url}\n`, JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  return json.data;
}
```

- [ ] **Step 4: Update `lib/shopify/__tests__/storefront-cache.test.ts`** — add `vi.resetModules()` to ensure a fresh `env.server` module is imported each test cycle

```ts
// lib/shopify/__tests__/storefront-cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      const memo = new Map<string, ReturnType<T>>()
      return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args)
        if (memo.has(key)) return memo.get(key) as ReturnType<T>
        const result = fn(...args) as ReturnType<T>
        memo.set(key, result)
        return result
      }) as T
    },
  }
})

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ok: true } }),
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test.myshopify.com')
  vi.stubEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'test-token')
  vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'admin-token')
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('BUNNYCDN_STORAGE_ACCESS_KEY', 'bunny-key')
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

Note: `vi.resetModules()` ensures `env.server.ts` is freshly imported after each `vi.stubEnv` call. The additional env var stubs (`SHOPIFY_ADMIN_ACCESS_TOKEN`, `RESEND_API_KEY`, `BUNNYCDN_STORAGE_ACCESS_KEY`) satisfy `env.server.ts` validation which is now triggered when `storefront.ts` is imported.

- [ ] **Step 5: Run the storefront test**

```
npx vitest run lib/shopify/__tests__/storefront-cache.test.ts
```

Expected: 1 test passes

- [ ] **Step 6: Run full suite**

```
npx vitest run
```

Expected: 244+ tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/storefront.ts lib/shopify/admin.ts lib/shopify/customer.ts \
  lib/shopify/__tests__/storefront-cache.test.ts
git commit -m "refactor: Shopify libs read from serverEnv and site-config"
```

---

## Task 6: Migrate `lib/resend.ts`

**Files:**
- Modify: `lib/resend.ts`

**Interfaces:**
- Consumes: `serverEnv.resendApiKey`, `serverEnv.resendFromEmail`, `serverEnv.resendToEmail` from `lib/env.server`
- Produces: same `FROM_EMAIL`, `TO_EMAIL`, `getResend()` exports — the only behavioural change is `getResend()` no longer needs to throw manually since `serverEnv.resendApiKey` is guaranteed non-empty at startup

- [ ] **Step 1: Update `lib/resend.ts`**

```ts
// lib/resend.ts
import { Resend } from 'resend'
import { serverEnv } from '@/lib/env.server'

export const FROM_EMAIL = serverEnv.resendFromEmail
export const TO_EMAIL   = serverEnv.resendToEmail

let client: Resend | null = null

export function getResend(): Resend {
  if (!client) {
    client = new Resend(serverEnv.resendApiKey)
  }
  return client
}
```

- [ ] **Step 2: Run full suite**

```
npx vitest run
```

Expected: 244+ tests pass

- [ ] **Step 3: Commit**

```bash
git add lib/resend.ts
git commit -m "refactor: resend.ts reads FROM_EMAIL/TO_EMAIL/apiKey from serverEnv"
```

---

## Task 7: Migrate auth routes and BunnyCDN proxy

**Files:**
- Modify: `app/api/auth/callback/route.ts`
- Modify: `app/api/auth/refresh/route.ts`
- Modify: `app/api/auth/logout/route.ts`
- Modify: `app/api/bunny/[...path]/route.ts`
- Modify: `app/api/bunny/[...path]/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `SITE_ORIGIN` from `lib/site-config`; `serverEnv.bunnyCdnAccessKey/Hostname/Zone` from `lib/env.server`

- [ ] **Step 1: Update `app/api/auth/callback/route.ts`**

Remove the local `SITE_URL` function; import `SITE_ORIGIN` from `@/lib/site-config`:

```ts
// app/api/auth/callback/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { exchangeToken } from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'

const SESSION_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code          = searchParams.get('code')
  const returnedState = searchParams.get('state')

  const storedVerifier = request.cookies.get(SESSION_COOKIES.CODE_VERIFIER)?.value
  const storedState    = request.cookies.get(SESSION_COOKIES.OAUTH_STATE)?.value

  if (!code || !storedVerifier || returnedState !== storedState) {
    return NextResponse.redirect(`${SITE_ORIGIN}/account?auth_error=1`)
  }

  try {
    const tokens    = await exchangeToken(code, storedVerifier)
    const expiresAt = Date.now() + tokens.expires_in * 1000

    const response = NextResponse.redirect(`${SITE_ORIGIN}/account`)
    response.cookies.set(SESSION_COOKIES.ACCESS_TOKEN,  tokens.access_token,  { ...SESSION_OPTS, maxAge: tokens.expires_in       })
    response.cookies.set(SESSION_COOKIES.REFRESH_TOKEN, tokens.refresh_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30       })
    response.cookies.set(SESSION_COOKIES.EXPIRES_AT,    String(expiresAt),    { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30       })
    if (tokens.id_token) {
      response.cookies.set(SESSION_COOKIES.ID_TOKEN, tokens.id_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    }
    response.cookies.delete(SESSION_COOKIES.CODE_VERIFIER)
    response.cookies.delete(SESSION_COOKIES.OAUTH_STATE)
    return response
  } catch {
    return NextResponse.redirect(`${SITE_ORIGIN}/account?auth_error=1`)
  }
}
```

- [ ] **Step 2: Update `app/api/auth/refresh/route.ts`**

```ts
// app/api/auth/refresh/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/shopify/customer'
import { SESSION_COOKIES, getSession } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'

const SESSION_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function GET(request: NextRequest) {
  const next    = request.nextUrl.searchParams.get('next') ?? '/account'
  const session = await getSession()

  if (!session?.refreshToken) {
    return NextResponse.redirect(`${SITE_ORIGIN}/api/auth/login`)
  }

  try {
    const tokens    = await refreshAccessToken(session.refreshToken)
    const expiresAt = Date.now() + tokens.expires_in * 1000

    const response = NextResponse.redirect(`${SITE_ORIGIN}${next}`)
    response.cookies.set(SESSION_COOKIES.ACCESS_TOKEN,  tokens.access_token,  { ...SESSION_OPTS, maxAge: tokens.expires_in })
    response.cookies.set(SESSION_COOKIES.REFRESH_TOKEN, tokens.refresh_token, { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    response.cookies.set(SESSION_COOKIES.EXPIRES_AT,    String(expiresAt),    { ...SESSION_OPTS, maxAge: 60 * 60 * 24 * 30 })
    return response
  } catch {
    return NextResponse.redirect(`${SITE_ORIGIN}/api/auth/login`)
  }
}
```

- [ ] **Step 3: Update `app/api/auth/logout/route.ts`**

```ts
// app/api/auth/logout/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { logoutUrl } from '@/lib/shopify/customer'
import { SESSION_COOKIES } from '@/lib/shopify/session'
import { SITE_ORIGIN } from '@/lib/site-config'

export async function GET(request: NextRequest) {
  const idToken = request.cookies.get(SESSION_COOKIES.ID_TOKEN)?.value

  let target = `${SITE_ORIGIN}/account`
  if (idToken) {
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: `${SITE_ORIGIN}/account`,
    })
    target = `${logoutUrl()}?${params}`
  }

  const response = NextResponse.redirect(target)
  response.cookies.delete(SESSION_COOKIES.ACCESS_TOKEN)
  response.cookies.delete(SESSION_COOKIES.REFRESH_TOKEN)
  response.cookies.delete(SESSION_COOKIES.EXPIRES_AT)
  response.cookies.delete(SESSION_COOKIES.ID_TOKEN)
  return response
}
```

- [ ] **Step 4: Update `app/api/bunny/[...path]/route.ts`**

Replace the three inline `process.env` reads with `serverEnv`. Remove the `if (!accessKey || !hostname || !zone) return 404` guard — missing vars now cause startup failure instead:

```ts
// app/api/bunny/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env.server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params

  if (path.some((segment) => segment === '..' || segment === '.' || segment === '')) {
    return new NextResponse(null, { status: 400 })
  }

  const upstreamUrl = `https://${serverEnv.bunnyCdnHostname}/${serverEnv.bunnyCdnZone}/${path.map(encodeURIComponent).join('/')}`
  const upstream = await fetch(upstreamUrl, { headers: { AccessKey: serverEnv.bunnyCdnAccessKey } })

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

- [ ] **Step 5: Update `app/api/bunny/[...path]/__tests__/route.test.ts`**

Mock `@/lib/env.server` so the static import of `GET` doesn't trigger real env var reads. Remove the "returns 404 when env vars not configured" test — that scenario is now a startup error covered by `env.server.test.ts`.

```ts
// app/api/bunny/[...path]/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    bunnyCdnAccessKey: 'test-key',
    bunnyCdnHostname: 'ny.storage.bunnycdn.com',
    bunnyCdnZone: 'md-supplies',
  },
}))

function makeRequest(path: string) {
  return new NextRequest(new URL(`http://localhost/api/bunny/${path}`))
}

function makeParams(path: string) {
  return { params: Promise.resolve({ path: path.split('/') }) }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/bunny/[...path]', () => {
  it('proxies the request to the BunnyCDN storage API with the AccessKey header', async () => {
    const body = new ReadableStream()
    vi.mocked(fetch).mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'image/webp' } }),
    )

    const res = await GET(makeRequest('mdsupplies/categories/gloves.webp'), makeParams('mdsupplies/categories/gloves.webp'))

    expect(fetch).toHaveBeenCalledWith(
      'https://ny.storage.bunnycdn.com/md-supplies/mdsupplies/categories/gloves.webp',
      { headers: { AccessKey: 'test-key' } },
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('returns 404 when the upstream object is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))

    const res = await GET(
      makeRequest('mdsupplies/placeholders/products/missing.webp'),
      makeParams('mdsupplies/placeholders/products/missing.webp'),
    )

    expect(res.status).toBe(404)
  })

  it('rejects path traversal segments with 400', async () => {
    const res = await GET(makeRequest('mdsupplies/..%2F..%2Fsecrets'), makeParams('mdsupplies/../../secrets'))

    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run the bunny test**

```
npx vitest run "app/api/bunny"
```

Expected: 3 tests pass (was 4 — the "missing env vars → 404" test is intentionally removed)

- [ ] **Step 7: Run full suite**

```
npx vitest run
```

Expected: all tests pass (total count is previous total minus 1 for the removed bunny test)

- [ ] **Step 8: Commit**

```bash
git add app/api/auth/callback/route.ts app/api/auth/refresh/route.ts \
  app/api/auth/logout/route.ts app/api/bunny/[...path]/route.ts \
  app/api/bunny/[...path]/__tests__/route.test.ts
git commit -m "refactor: auth routes and bunny proxy use SITE_ORIGIN and serverEnv"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the complete test suite**

```
npx vitest run
```

Expected: all tests pass

- [ ] **Step 2: TypeScript type-check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Grep for remaining bare process.env reads of migrated vars**

```
grep -rn "process\.env\.\(SHOPIFY_STORE_DOMAIN\|SHOPIFY_STOREFRONT_ACCESS_TOKEN\|SHOPIFY_ADMIN_ACCESS_TOKEN\|RESEND_API_KEY\|BUNNYCDN_STORAGE_ACCESS_KEY\|NEXT_PUBLIC_SITE_URL\)" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="node_modules" --exclude-dir=".next" \
  --exclude-dir="__tests__" --exclude="*.test.ts"
```

Expected: zero matches (only test fixtures and `.env.example` may reference them)

- [ ] **Step 4: Verify no server secrets appear in the bundle (spot check)**

```
grep -r "shopifyAdminToken\|SHOPIFY_ADMIN_ACCESS_TOKEN\|RESEND_API_KEY\|BUNNYCDN_STORAGE_ACCESS_KEY" .next/static 2>/dev/null | head -5
```

Expected: no output (`.next/static` may not exist if not built; skip if so)

- [ ] **Step 5: Commit**

No files changed in this task — it's a verification-only step. If `tsc` or grep revealed issues, fix them and commit as part of the affected task.
