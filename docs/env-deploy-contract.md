# Environment & Deploy Contract

**Owner:** Eng · **Last verified:** 2026-06-27 (T8 launch QA)

This is the source-of-truth contract for environment variables and deploy
configuration. The canonical template lives in [`.env.example`](../.env.example);
this document explains the *contract* (what is required, what is secret, what is
exposed to the browser, and how staging vs production differ).

---

## 1. Variable inventory

Every variable read by application code is listed below. "Read via" shows where
it is consumed. Secrets are funneled through [`lib/env.server.ts`](../lib/env.server.ts),
which begins with `import 'server-only'` so the module — and therefore every
secret — can never be bundled into client-side JavaScript.

| Variable | Required? | Secret? | Browser-exposed? | Read via |
|---|---|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | ✅ required | no | no | `lib/env.server.ts` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | ✅ required | **yes** | no | `lib/env.server.ts` |
| `RESEND_API_KEY` | ✅ required | **yes** | no | `lib/env.server.ts` |
| `RESEND_FROM_EMAIL` | optional (default `noreply@mdsupplies.com`) | no | no | `lib/env.server.ts` |
| `RESEND_TO_EMAIL` | optional (default `team@mdsupplies.com`) | no | no | `lib/env.server.ts` |
| `RESEND_SOURCING_TO_EMAIL` | optional (falls back to `RESEND_TO_EMAIL`) | no | no | `lib/resend.ts` |
| `BUNNYCDN_STORAGE_ACCESS_KEY` | ✅ required | **yes** | no | `lib/env.server.ts` |
| `BUNNYCDN_STORAGE_HOSTNAME` | optional (default `ny.storage.bunnycdn.com`) | no | no | `lib/env.server.ts` |
| `BUNNYCDN_STORAGE_ZONE` | optional (default `md-supplies`) | no | no | `lib/env.server.ts` |
| `SHOPIFY_CUSTOMER_ACCOUNT_URL` | ✅ required for auth | no (OAuth base) | no | `lib/site-config.ts` |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | ✅ required for auth | no (public client ID) | no | `lib/site-config.ts` |
| `NEXT_PUBLIC_SITE_URL` | ✅ required | no | **yes** (`NEXT_PUBLIC_`) | `lib/site-config.ts`, SEO |
| `NEXT_PUBLIC_GTM_ID` | optional | no | **yes** (`NEXT_PUBLIC_`) | `app/layout.tsx` |
| `NEXT_PUBLIC_IS_STAGING` | optional (set to `true` on staging only) | no | **yes** (`NEXT_PUBLIC_`) | `lib/seo/robots.ts`, `app/layout.tsx` |

> `NODE_ENV` and `NEXT_RUNTIME` are framework-managed and not configured by us.

### Browser-exposure invariant

**Only `NEXT_PUBLIC_*` variables are exposed to the browser.** Verified by:

- No `"use client"` file references `process.env` (grep across `app/`, `components/`, `lib/`).
- All secrets are read exclusively through `lib/env.server.ts` (`import 'server-only'`).
- `lib/site-config.ts` reads two non-`NEXT_PUBLIC_` values, but both are
  non-secret (OAuth base URL + public OAuth client ID) and are imported only by
  server routes/modules (`app/api/auth/*`, `lib/shopify/customer.ts`,
  `lib/seo/constants.ts`).

The three `NEXT_PUBLIC_*` values are all non-secret by design.

---

## 2. Secret handling

- `.env*` is gitignored except `.env.example` (see `.gitignore`). `.env` and
  `.env.local` are confirmed **not** tracked by git.
- Real secret values live in the team vault (1Password / secrets manager), never
  in Slack, PRs, or commits.
- Local dev: `cp .env.example .env.local` and fill in the blank secret values.

---

## 3. Staging vs Production

| Setting | Staging | Production |
|---|---|---|
| `NEXT_PUBLIC_IS_STAGING` | `true` | **unset** (or anything ≠ `true`) |
| `robots.txt` | `Disallow: /` (whole site) | normal allow rules + sitemap |
| `sitemap.xml` | empty (`[]`) | full URL set |
| `<meta robots>` | `noindex,nofollow` on every page | per-page index policy |
| GTM / analytics | disabled | enabled (when `NEXT_PUBLIC_GTM_ID` set) |

The single switch is `NEXT_PUBLIC_IS_STAGING`. It resolves through
`STAGING_GUARD` in `lib/seo/robots.ts`
(`process.env.NEXT_PUBLIC_IS_STAGING === 'true'`) and feeds:

- `getRobotsConfig()` → `lib/seo/robots-config.ts` (robots.txt)
- `getSitemapUrls()` → `lib/seo/sitemap.ts` (empty sitemap when staging)
- `buildRobots()` → `lib/seo/metadata.ts` (per-page meta robots)
- `app/layout.tsx` (suppresses GTM + analytics on staging)

Behavior is covered by `lib/seo/__tests__/robots.test.ts`.

**Deploy checklist**
- [ ] Staging deploy sets `NEXT_PUBLIC_IS_STAGING=true`.
- [ ] Production deploy does **not** set `NEXT_PUBLIC_IS_STAGING` (or sets it to a non-`true` value).
- [ ] Production `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS origin (no trailing slash).
- [ ] All `required` secrets are present in the deploy environment (a missing one throws at first server use with a clear `[env] Missing required server variable` message).
- [ ] `/api/auth/callback` for the deploy's origin is registered as a callback URI on the Customer Account API client.
