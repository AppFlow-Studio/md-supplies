# Site Config + Server Env Validator — Design Spec

**Date:** 2026-06-25
**Status:** Approved
**Task:** DEV-03 (P1) — single site-config module + server-only env validator

---

## Problem

`lib/seo/constants.ts` exports `SITE_URL` but the canonical origin is duplicated in four other places:

- `app/api/auth/callback/route.ts` — local `SITE_URL()` function
- `app/api/auth/refresh/route.ts` — local `SITE_URL()` function
- `app/api/auth/logout/route.ts` — local `siteUrl` variable
- `lib/shopify/customer.ts` — two inline `process.env.NEXT_PUBLIC_SITE_URL` reads

Shopify env vars are read unvalidated at module load time. A missing `SHOPIFY_STORE_DOMAIN` silently produces `https://undefined/api/...`. A missing `SHOPIFY_CUSTOMER_ACCOUNT_URL` falls back to `''`, producing OAuth URLs with no host. `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` is used with TypeScript's `!` non-null assertion in three places without any runtime check.

---

## Acceptance Criteria

- No URL contains `undefined` or `null`
- No server secret appears in `.next/static`
- Every canonical URL, JSON-LD URL, sitemap URL, and OG URL shares one origin constant
- Config errors produce safe, actionable messages (variable name + where to fix it)
- Server startup fails before serving any request if a required var is missing

---

## File Structure

Two new library files, one new project-root file, and targeted updates to existing modules. No new directories.

```
lib/site-config.ts          ← NEW: public constants, importable anywhere
lib/env.server.ts           ← NEW: server-only validated env, throws on missing vars
instrumentation.ts          ← NEW: project root, forces startup validation
lib/seo/constants.ts        ← UPDATED: thin re-export shim, no inline process.env reads
lib/shopify/storefront.ts   ← UPDATED: reads from serverEnv
lib/shopify/admin.ts        ← UPDATED: reads from serverEnv
lib/shopify/customer.ts     ← UPDATED: reads from site-config + serverEnv removed
lib/resend.ts               ← UPDATED: reads from serverEnv
app/api/auth/callback/route.ts  ← UPDATED: import SITE_ORIGIN
app/api/auth/refresh/route.ts   ← UPDATED: import SITE_ORIGIN
app/api/auth/logout/route.ts    ← UPDATED: import SITE_ORIGIN
app/api/bunny/[...path]/route.ts ← UPDATED: reads from serverEnv
```

---

## `lib/site-config.ts`

Importable anywhere (no `server-only` guard). Contains only public values — either `NEXT_PUBLIC_*` vars (bundled by Next.js into the client) or non-secret server vars that are safe to expose.

```ts
export const SITE_NAME = 'MDSupplies' as const

export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mdsupplies.com'
).replace(/\/$/, '')

export const SHOPIFY_CUSTOMER_ACCOUNT_URL =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL ?? ''

export const SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID =
  process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID ?? ''
```

**Notes:**
- `SITE_ORIGIN` is named for precision ("origin" = scheme + host, no path). `lib/seo/constants.ts` re-exports it as `SITE_URL` for zero churn in downstream imports.
- `NEXT_PUBLIC_SITE_URL` falls back to `'https://mdsupplies.com'` (canonical production domain) — a missing var in dev means the developer uses the prod URL, not a broken URL. The startup validator does NOT assert this var.
- The two Customer Account vars fall back to `''`. The startup validator asserts they are non-empty. The fallback of `''` is intentional — it signals "not configured" without producing a malformed URL at import time.

---

## `lib/env.server.ts`

Server-only. The `serverEnv` object is evaluated once when the module is first imported. Any missing `required()` var throws immediately with a named, actionable error.

```ts
import 'server-only'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(
    `[env] Missing required server variable: ${name}. ` +
    `Check .env.local (dev) or your deployment environment (prod).`
  )
  return v
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback
}

export const serverEnv = {
  // Shopify Storefront API
  shopifyStoreDomain:     required('SHOPIFY_STORE_DOMAIN'),
  shopifyStorefrontToken: required('SHOPIFY_STOREFRONT_ACCESS_TOKEN'),
  // Shopify Admin API
  shopifyAdminToken:      required('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  // Resend
  resendApiKey:           required('RESEND_API_KEY'),
  resendFromEmail:        optional('RESEND_FROM_EMAIL', 'noreply@mdsupplies.com'),
  resendToEmail:          optional('RESEND_TO_EMAIL', 'team@mdsupplies.com'),
  // BunnyCDN
  bunnyCdnAccessKey:      required('BUNNYCDN_STORAGE_ACCESS_KEY'),
  bunnyCdnHostname:       optional('BUNNYCDN_STORAGE_HOSTNAME', 'ny.storage.bunnycdn.com'),
  bunnyCdnZone:           optional('BUNNYCDN_STORAGE_ZONE', 'md-supplies'),
} as const
```

**Notes:**
- `'server-only'` import guard prevents this module from entering `.next/static` bundles.
- `SHOPIFY_CUSTOMER_ACCOUNT_URL` and `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` are intentionally absent — they are public values that live in `site-config.ts`. Their startup assertion happens in `instrumentation.ts`.
- `RESEND_API_KEY` moves from the existing lazy-throw pattern in `lib/resend.ts` to eager validation here. The lazy pattern was a workaround for the absence of a startup validator.

---

## `instrumentation.ts` (project root)

Runs once when the Next.js server initialises, before any request is served. Importing `./lib/env.server` triggers module evaluation, which throws on any missing `required()` var. The Customer Account vars (which live in `site-config.ts`, not `serverEnv`) are asserted explicitly.

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env.server')

    const { SHOPIFY_CUSTOMER_ACCOUNT_URL, SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID } =
      await import('./lib/site-config')

    if (!SHOPIFY_CUSTOMER_ACCOUNT_URL)
      throw new Error('[env] Missing required server variable: SHOPIFY_CUSTOMER_ACCOUNT_URL')
    if (!SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID)
      throw new Error('[env] Missing required server variable: SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID')
  }
}
```

**Notes:**
- `NEXT_RUNTIME === 'nodejs'` guard skips the check in the Edge runtime (which also runs `register()` but cannot access these Node.js env vars).
- `NEXT_PUBLIC_SITE_URL` is not asserted — the fallback is valid and intentional.

---

## Migration: Existing Files

### `lib/seo/constants.ts`

`SITE_NAME` and `SITE_URL` become re-exports from `site-config`. The remaining constants (`DEFAULT_OG_IMAGE`, `DEFAULT_TITLE`, `DEFAULT_DESCRIPTION`, `OG_IMAGE_WIDTH`, `OG_IMAGE_HEIGHT`) stay in this file — they are derived page-metadata values, not raw config. The import of `GLOBAL_PRODUCT_PLACEHOLDER` from `lib/bunnycdn` stays as-is; `SITE_URL` used to build `DEFAULT_OG_IMAGE` is replaced with `SITE_ORIGIN` from `site-config`.

All downstream imports (`canonical.ts`, `sitemap.ts`, `og.ts`, `schema/*.ts`, `robots-config.ts`) continue to import from this file unchanged.

### `lib/shopify/storefront.ts`

Replace `process.env.SHOPIFY_STORE_DOMAIN` and `process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!` with `serverEnv` equivalents.

### `lib/shopify/admin.ts`

Replace `process.env.SHOPIFY_STORE_DOMAIN` and `process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!` with `serverEnv` equivalents.

### `lib/shopify/customer.ts`

- Replace `authBase()` to return `SHOPIFY_CUSTOMER_ACCOUNT_URL` from `site-config`
- Replace three `process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!` reads with `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` from `site-config`
- Replace two `process.env.NEXT_PUBLIC_SITE_URL` reads with `SITE_ORIGIN` from `site-config`

### `lib/resend.ts`

- `FROM_EMAIL` / `TO_EMAIL` read from `serverEnv.resendFromEmail` / `serverEnv.resendToEmail`
- `getResend()` reads `serverEnv.resendApiKey` — the existing null-check and throw are removed (startup validator provides the guarantee)

### `app/api/auth/callback/route.ts`, `refresh/route.ts`, `logout/route.ts`

Remove local `SITE_URL` function / `siteUrl` variable. Import `SITE_ORIGIN` from `@/lib/site-config`.

### `app/api/bunny/[...path]/route.ts`

Replace three `process.env.BUNNYCDN_*` reads with `serverEnv.bunnyCdnAccessKey`, `serverEnv.bunnyCdnHostname`, `serverEnv.bunnyCdnZone`. The existing 404-on-missing-var guard is removed — startup failure is now the contract.

---

## Data Flow

```
instrumentation.ts (boot)
  └─ import lib/env.server   → throws if any required server var missing
  └─ assert site-config vars → throws if Customer Account vars empty

lib/site-config.ts           → SITE_ORIGIN, SITE_NAME, public Customer Account values
  └─ imported by: lib/seo/constants.ts, lib/shopify/customer.ts, app/api/auth/*/route.ts

lib/env.server.ts            → serverEnv (typed, validated object)
  └─ imported by: lib/shopify/storefront.ts, lib/shopify/admin.ts,
                  lib/resend.ts, app/api/bunny/[...path]/route.ts

lib/seo/constants.ts         → re-exports SITE_URL, SITE_NAME (backward-compat shim)
  └─ imported by: canonical.ts, sitemap.ts, og.ts, schema/*.ts, robots-config.ts (unchanged)
```

---

## Error Message Format

All validation errors follow one template:

```
[env] Missing required server variable: <VAR_NAME>. Check .env.local (dev) or your deployment environment (prod).
```

No secret values appear in error messages. The var name is enough to identify where to look.

---

## Testing

Existing tests mock `process.env` via `vi.stubEnv()` and remain unaffected — the validator reads from `process.env` at module load, and test setup stubs the relevant vars before importing the module under test.

No new tests are required for the validator itself: the logic is a one-liner (`if (!v) throw`), and integration is verified by the existing Storefront/Admin fetch tests that already stub the env vars they need.
