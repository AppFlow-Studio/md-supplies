# MDSupplies — Cutover checklist + rollback runbook

**This document stands alone.** Anyone on-call must be able to execute cutover
or rollback from this page only, with the dashboard credentials in the team
vault — no chat history required.

- **Release candidate:** tag `rc-2026-07-19.1` = commit `f1e31d7` on `munis` (supersedes `rc-2026-07-19`/`54d7e54` — rx-scan parser fix)
  (repo `github.com/AppFlow-Studio/md-supplies`)
- **Current state before cutover:** `mdsupplies.com` serves the LEGACY Shopify
  storefront (DNS at Cloudflare → Shopify). The new Next.js site runs on
  Vercel (project `md-supplies`) and is not yet on the domain.
- **Cutover =** pointing the domain's DNS at Vercel. **Full rollback =**
  pointing it back at Shopify (the legacy store keeps working the whole time —
  this is the safety net that makes the launch low-risk).

## Roles

| Role | Owner | Responsibility |
|---|---|---|
| Release owner | Munis | code freeze, tag, Vercel deploy, this checklist |
| Shopify-side owner | Izzy | Shopify snapshot/checksums, theme/settings freeze, Shopify rollback |
| DNS owner | (whoever holds the Cloudflare account) | record flips, TTL |
| On-call after cutover | assign before starting | monitoring + rollback trigger authority |

## 0. Freeze (T-1 day)

- [ ] `munis` frozen at the RC tag — only cutover-blocking fixes may land, each
      re-tagged (`rc-2026-07-19.1`, …) and re-run through CI.
- [ ] Non-essential Shopify admin changes frozen (products, collections,
      metafields, shipping zones) — Izzy announces the freeze.
- [ ] Izzy captures the Shopify snapshot: product/collection CSV exports,
      theme export, shipping-zone screenshots, webhook list, metafield
      definitions — stored in the shared drive with checksums (`shasum -a 256`).
- [ ] Environment-variable manifest verified (names below, §5) — every var
      present in Vercel *Production* env, values from the vault. Rotated Bunny
      key (2026-07-19) is the current one.
- [ ] Redirect/robots/sitemap snapshot captured from the RC build (§6).
- [ ] CI green on the exact RC SHA (lint 0/0, tsc 0, vitest, build, e2e, audit,
      secret scan) — record the run URL.

## 1. Rollback rehearsal (MUST happen before cutover — the ticket's hard gate)

Rehearse in the safe environment (Vercel preview + local), timed with a
stopwatch. Record actuals in §7.

1. **Code rollback drill (Vercel):** Vercel dashboard → Project → Deployments
   → pick the deployment *before* the RC → ⋯ → **Promote to Production** (or
   **Instant Rollback** on the current production deployment). Verify the old
   deployment serves on the vercel.app URL. Then promote the RC back.
   *Expected: 1–3 min per direction, no build required (both are already-built
   deployments).*
2. **Config/data restore drill (Shopify, Izzy):** restore one sample from the
   snapshot — e.g. re-import one product CSV row into a draft product and
   diff it against the export; verify checksum of the stored archive first.
   An archive that has never been restored does not count as a backup.
3. **Local code drill (done 2026-07-19, see §7):** `git checkout <prior-sha>`
   → `npm ci && npm run build && npm run start` → verify /, /category/gloves,
   /product/…, cart open, /account → `git checkout rc-2026-07-19` → rebuild.
4. Record: times, and every credential/dependency someone needed that they
   didn't have (those are the real findings).

## 2. Cutover checklist (execution day)

Work top to bottom; check every box; **log every intervention with a
timestamp; no opportunistic edits of any kind.**

Pre-flight:
- [ ] Vercel production deployment SHA == `f1e31d7` (Deployments → current →
      commit). If not: stop.
- [ ] Production smoke on the vercel.app URL: home, category, PDP, cart panel,
      /account login, contact + sourcing form send, /api/bunny image loads.
- [ ] `RX_SCAN_REQUIRED=true` set **only if** the ClamAV service is live;
      otherwise leave unset and log the exception.
- [ ] Izzy confirms Shopify webhooks point at `https://mdsupplies.com/api/revalidate`
      (they will start firing at the new site after the flip).
- [ ] On-call + rollback owners online; this runbook open; stopwatch ready.

DNS flip (Cloudflare):
- [ ] Lower TTL on the apex/`www` records to 300s (do this ≥1h before if possible).
- [ ] Point apex + `www` per Vercel's domain instructions (Vercel → Project →
      Settings → Domains → add `mdsupplies.com` + `www.mdsupplies.com`; use the
      shown A/CNAME targets). Keep the Shopify records saved in a text note —
      **they are the rollback**.

Verify (within 15 min of flip, from a clean network/incognito):
- [ ] `mdsupplies.com` + `www` serve the NEW site; TLS cert valid (padlock, no warnings)
- [ ] Deployed SHA still `54d7e54` (`x-vercel-id` header present = Vercel serving)
- [ ] Canonical tags on /, a category, a PDP point at `https://mdsupplies.com/...`
- [ ] `/robots.txt` = production version (not staging Disallow); `/sitemap.xml`
      renders with full route set; spot-check counts vs the §6 snapshot
- [ ] 3–5 legacy product URLs from `docs/redirects-ready.json` 301 to their new
      homes, single hop
- [ ] Shopify API health: PDP renders live data; add to cart works; checkout
      handoff reaches Shopify checkout
- [ ] RX gate ACTIVE: an rx-only product blocks checkout signed-out; upload
      flow works signed-in
- [ ] Shipping rates appear in checkout for a test address (Izzy verifies
      zone behavior)
- [ ] Contact + sourcing forms deliver (check inbox); auth callback works
      (login → back to /account)
- [ ] Analytics: GTM/GA4 realtime shows the visit; no CSP violations flooding
      `/api/csp-report`
- [ ] Monitoring dashboards live (§3) — screenshot for the ticket

## 3. Post-cutover monitoring (first 48h; check at +15m, +1h, +4h, +24h, +48h)

| Signal | Where | Rollback trigger (guideline) |
|---|---|---|
| Checkout creations vs failures | Shopify admin → Analytics / Live view | failures spiking or creations at ~0 for >15 min |
| API/auth errors | Vercel → Logs (filter `error`), `[rx]`/`shopify-admin` tags | sustained error storm |
| 404s / redirect loops | Vercel logs (404 status), Search Console (later) | legacy URL class 404ing en masse |
| No-rate carts | Shopify checkout tests + support inbox | any reproducible no-rate address in US/CA |
| RX blocks | `[rx-audit]` + `[rx]` logs | gate not blocking (CRITICAL — see below) |
| Form delivery | Resend dashboard → Emails | sends failing |
| Core Web Vitals | Vercel Speed Insights / PageSpeed on live URL | regression vs pre-launch numbers |
| CSP reports | `/api/csp-report` logs | flood of violations on real browsers |

**RX gate failure is a stop-ship:** if rx-only items are reaching checkout
ungated, roll back immediately — compliance risk beats uptime.

## 4. Rollback procedure (rehearsed; execute top-down, stop at the first level that resolves)

**Level 1 — bad deploy, site itself fine (minutes):**
Vercel → Deployments → previous good deployment → Promote to Production /
Instant Rollback. No DNS change. Verify home/category/PDP/cart.

**Level 2 — new site fundamentally broken on the domain (10–30 min incl. DNS):**
Cloudflare → restore the saved Shopify DNS records (from the §2 text note) →
the legacy Shopify store serves again. Izzy confirms legacy checkout works.
TTL 300 means propagation ≤ ~5 min for most users.

**Level 3 — Shopify data damaged (Izzy):**
restore from the frozen snapshot (products/collections/theme per the drill in
§1.2). App site can stay up if unaffected.

After any rollback: log the time-to-recover, freeze all further changes, and
post-mortem before re-attempting cutover.

## 5. Environment-variable manifest (names only — values live in the vault/Vercel)

`NEXT_PUBLIC_SITE_URL` (=`https://mdsupplies.com` in prod — build fails otherwise),
`NEXT_PUBLIC_IS_STAGING` (unset in prod), `NEXT_PUBLIC_GTM_ID`,
`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`,
`SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_ADMIN_ACCESS_TOKEN` (scope: read/write
customers only), `SHOPIFY_CUSTOMER_ACCOUNT_URL`, `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`,
`RESEND_API_KEY` (+3 optional `RESEND_*` overrides),
`BUNNYCDN_STORAGE_ACCESS_KEY` (rotated 2026-07-19) + 2 optional `BUNNYCDN_*`,
`RX_SCAN_CLAMAV_URL` / `RX_SCAN_AUTH_TOKEN` / `RX_SCAN_REQUIRED` (ClamAV, §2).

GitHub Actions secrets: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.

## 6. Redirect / robots / sitemap snapshot (RC)

- Redirect map: `docs/redirects-ready.json` — 1,285 legacy product URLs, zero
  chains, enforced by `proxy.ts` (plus the static entries in its
  `REDIRECT_ENTRIES`). The file at tag `rc-2026-07-19` IS the snapshot.
- `robots.txt` / `sitemap.xml` are runtime-generated (staging-aware); capture
  from the RC build during rehearsal and store alongside this doc
  (`rc-robots.txt`, `rc-sitemap-counts.txt`).

## 7. Rehearsal + matrix record (fill during execution)

| Item | Result | Time |
|---|---|---|
| Test matrix on RC SHA | ✅ all rows green on `f1e31d7` (see §7.1) | 2026-07-19 |
| Local code rollback drill | ✅ 2026-07-19: RC → `d1fea36` (pre-release merge) with `npm ci` + full build + serve, all 5 critical routes 200; then back to RC, all 200. Repo verified back on `munis`@`f1e31d7` | roll back **5m16s**, restore **1m34s**, round-trip **6m50s** |
| Vercel promote/rollback drill | ✅ executed by Munis 2026-07-19 in the Vercel dashboard: promoted a prior deployment to Production, verified, promoted the RC back, verified (stopwatch screenshots in ticket) | roll back **1m02s**, restore **42s** |
| Shopify sample restore (Izzy) | pending — needs Izzy | |
| Missing dependencies discovered | none code-side. Notes: (1) local drill pays a full `npm ci`+build (~5 min) — the Vercel path avoids this entirely by promoting pre-built deployments, which is why Level 1 rollback is the Vercel dashboard, never a local rebuild; (2) robots/sitemap snapshot captured from a dev-env build (staging-mode robots) — production values must be re-verified at cutover per §2 | |

### 7.1 Test matrix on `54d7e54`

| Row | Command | Result (2026-07-19, `f1e31d7` = `rc-2026-07-19.1`) |
|---|---|---|
| Lint (0 warnings) | `npx eslint --max-warnings 0` | ✅ PASS |
| Types | `npx tsc --noEmit` | ✅ PASS |
| Unit/component (incl. RX bypass, redirects, forms) | `npx vitest run` | ✅ 818/818 (94 files) |
| Production build | `npm run build` | ✅ PASS |
| Dependency audit | `npm audit --audit-level=high` | ✅ PASS (0 high/critical) |
| E2E incl. a11y/axe + visual (chromium + mobile) | `npx playwright test` | ✅ 48/48 |

Snapshot artifacts (same run): `rc-robots.txt`, `rc-sitemap-counts.txt`
(8,142 sitemap URLs) in this directory.

## 8. GO matrix (sign before DNS flip)

| Area | Owner | GO/NO-GO | Signature/date |
|---|---|---|---|
| CI quality gate | | | |
| Security / RX storage | | | |
| RX enforcement | | | |
| Shipping classification | Izzy | | |
| Redirects / SEO | | | |
| Category architecture | | | |
| Rollback rehearsed + timed | | | |
| On-call staffed | | | |
