# DEV-LAUNCH-01 — Launch Baseline

**Ticket:** DEV-LAUNCH-01 (Developers Final Launch Configuration & Implementation Plan, 2026-08-05)
**Owner:** Developers · **Priority:** P0 launch gate

## Starting SHA and branches

- **Baseline SHA:** `c077a5ea4e3a526a022a5d59a319d072824cbd6c`
- `catalog-cro-review-sardor-dev` (local) and `origin/catalog-cro-review` are identical at this SHA (0 ahead / 0 behind, confirmed via `git merge-base` and `git rev-list --left-right --count`).
- **Task branch for this ticket:** `task/dev-launch-01-baseline`, cut from `catalog-cro-review-sardor-dev` at the SHA above. No commits landed directly on `catalog-cro-review-sardor-dev` or `main`.

## Toolchain

- Node: `v22.16.0` (matches `engines.node: "22.x"`).
- npm: system default was `11.4.1`, which does **not** match `packageManager: "npm@10.9.3"`. All gates below were run through `corepack npm`, which resolves to the pinned `10.9.3` for install, matching CI's effective toolchain more closely. `npx`/`npm run` for lint, typecheck, test and build use whatever npm is on PATH, which only affects binary resolution (not tool versions) since all tools run from `node_modules/.bin`.
- **Finding:** the local machine's global npm (11.4.1) drifts from the project's pinned `10.9.3`. Recommend `corepack enable` (needs admin on this machine — see below) or documenting `corepack npm` as the required invocation for anyone running gates locally.

## Command results (in order run)

| Gate | Command | Exit | Result |
|---|---|---|---|
| Install | `corepack npm ci` | 0 | 483 packages installed. 3 high-severity advisories reported by `npm audit` (informational; not part of this ticket's acceptance criteria — tracked separately by the `dependency-audit` CI job and `docs/security/dependency-risk-exceptions.md`). |
| Lint | `npx eslint . --max-warnings 0` | 0 (after two environment fixes — see Baseline failures) | 0 errors, 0 warnings on tracked source. |
| Typecheck | `npx tsc --noEmit` | 0 (after clearing stale `.next` — see Baseline failures) | Clean. |
| Unit tests | `npm test` (`vitest run`) | 0 | **120 test files passed, 1148 tests passed**, 0 failed, 0 skipped. |
| No skipped/focused/todo tests | `git grep` scan (same pattern CI uses) | 1 (no matches = clean) | None found in `*.test.ts`, `*.test.tsx`, `e2e/*.spec.ts`. |
| Build | `npm run build` (`next build`) | 0 | Succeeded against **real QA data**, zero Storefront API errors — see finding 6. |

## Baseline failures discovered before implementation

1. **`npm ci` blocked by a locked file (environment, not code).** WebStorm's Tailwind CSS language-server helper processes (`tailwindcss-language-server`, `oxide-helper.js`) held `node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node` open, causing `EPERM` on unlink. Resolved by terminating those 4 background processes (user-approved) before retrying; not a code defect.

2. **`npx eslint . --max-warnings 0` failed (exit 1) on first run — environment artifacts, not tracked source.** 2 errors + 14 warnings, entirely inside:
   - `.claude/worktrees/form-antibot-geolock/**` — a live git worktree for the in-progress `worktree-form-antibot-geolock` branch. It is gitignored/untracked but **not** excluded by `eslint.config.mjs`, whose `globalIgnores` only lists `.worktrees/**`, not `.claude/worktrees/**` (the path this project's worktree tooling actually uses).
   - `qa-sweep.js` — a gitignored (`/qa-sweep.js`) local scratch script at repo root, not eslint-ignored, using `require()` (2 errors).
   Re-running with those two known-noise paths excluded confirms **tracked source lints clean (exit 0, 0 problems)**. A fresh checkout with no leftover worktrees or scratch files would pass the literal acceptance command as-is.
   **Recommendation (not applied here, per "no edits before baseline"):** add `.claude/worktrees/**` to `eslint.config.mjs`'s `globalIgnores` in a follow-up task branch, since that's the actual worktree path in use.

3. **`npx tsc --noEmit` failed (exit 2) on first run — stale generated cache, not tracked source.** Two `TS2307` errors from `.next/types/validator.ts` and `.next/dev/types/validator.ts` referencing `app/category-browse/[slug]/page.js`, a route that no longer exists in tracked source (confirmed via `git ls-files`). `.next/` is gitignored, machine-local, and was stale from a prior `next dev`/`build` run before that route was removed/renamed. Deleting `.next` (a regenerable, gitignored build-output directory — not source) and re-running gives a clean `exit 0`.

4. **`.env.local` was configured against the PRODUCTION Shopify store, not QA — a real risk, not just a gate failure.** `SHOPIFY_STORE_DOMAIN` was set to `daebb2-76.myshopify.com`, which is literally `PRODUCTION_SHOP_DOMAIN` as hardcoded in `lib/shopify/shop-guard.ts`, not `QA_SHOP_DOMAIN` (`md-supplies-qa-shipping-and-checkout.myshopify.com`). The shop-guard is specifically designed to fail closed in this situation. Per user instruction, `.env.local` was updated (original values backed up outside the repo, not committed — `.env.local` stays gitignored) so that **only** `SHOPIFY_STORE_DOMAIN` changed to the QA domain; `SHOPIFY_STOREFRONT_ACCESS_TOKEN` was left as-is (unchanged from the original value).

   With the domain corrected but the token unchanged, the shop-guard passed (domain check only), but the build still produced repeated `Storefront API HTTP 401: Unauthorized` during static generation — identical to the placeholder-token run. This confirms the existing token is scoped to the production store and is not valid against the QA store's Storefront API; a Storefront access token is issued per-shop and does not carry over. The build still exited `0` — pages that couldn't fetch live data rendered dynamically (`ƒ`) instead of the intended static/ISR (`○`) — so at that point **exit 0 was not yet a faithful QA-data build.** Resolved in finding 6 below.

5. **Turbopack tracing warning (informational, non-blocking).** `next.config.ts` → `lib/shipping-resolver/data.ts` → `lib/shipping-resolver/resolve.ts` triggers "Encountered unexpected file in NFT list" because of dynamic `fs`/`path` usage in the shipping-resolver data loader. Did not fail the build; noted for awareness only.

6. **Real QA credentials received (2026-08-06) and wired in — with one non-obvious pitfall.** The manager sent a full QA-store credential set. Shopify issues Storefront access tokens in two forms per store: a **public** token (unprefixed hex, e.g. `465ba4...`) and a **private/server** token (`shpat_...`, labeled "Secret / Server-Side Only"). Since every Storefront call in this app is server-only (`lib/shopify/storefront.ts` imports `server-only`), the private token looked like the correct choice and was tried first — it still 401'd. Direct `curl` tests against the QA store isolated the cause: on this store, only the **public** token authenticates with the `X-Shopify-Storefront-Access-Token` header this codebase uses (verified: public token → `200`, returns `{"shop":{"name":"MD Supplies QA - Shipping and Checkout"}}`; private token → `401` on that header, and also `401` with `Authorization: Bearer`, on both API `2026-04` and `2026-07`). The API version mismatch (app hardcodes `2026-04` in `lib/shopify/storefront.ts`/`admin.ts`/`customer.ts`; manager's doc specifies `2026-07`) was ruled out as a cause — the public token authenticates fine on `2026-04` too, so no source change is required to unblock this ticket. `.env.local` now has `SHOPIFY_STOREFRONT_ACCESS_TOKEN` set to the public token. Re-running `npm run build` with this value: **exit `0`, zero Storefront API errors, all 67 pages generated against real QA data.** This is the ticket's faithful QA-data build baseline.

   **Not yet wired (flagging rather than guessing, since these gate a sensitive feature and a mapping error could misconfigure it silently):**
   - `SHOPIFY_ADMIN_ACCESS_TOKEN` (gates the RX prescription customer-metafield read/write) — the manager's doc provides `QA_ADMIN_API_CLIENT_ID` / `QA_ADMIN_API_CLIENT_SECRET` (an OAuth client id/secret pair, for the token-exchange flow via `QA_ADMIN_TOKEN_ENDPOINT`) and a separately-prefixed `QA_ADMIN_APP_AUTOMATION_TOKEN` (`atkn_...`, a prefix not seen elsewhere in this codebase). None of these is obviously "paste this in as `SHOPIFY_ADMIN_ACCESS_TOKEN`" the way the Storefront tokens were — `.env.local` still holds the old production-shaped `shpca_...` value for this one. Needs a definitive answer from whoever owns the QA store's custom-app setup before it's changed.
   - `SHOPIFY_CUSTOMER_ACCOUNT_URL` — the code requires the exact form `https://shopify.com/authentication/<shop-id>` (see `lib/shopify/customer.ts`); the manager's `QA_CUSTOMER_AUTH_DISCOVERY_URL` (`.../.well-known/openid-configuration`) is a different Shopify OAuth surface (an OIDC discovery document) and isn't a drop-in substitute. `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` **was** updated to the QA value (`5ec80321-b310-4f48-b3f6-1885ca6e58d0`), but the URL is unresolved.
   - The store's access password (to bypass the storefront password wall in a browser) was provided but isn't consumed anywhere in this codebase — the Storefront API used for prerendering doesn't go through the password-protected HTML storefront, so it isn't needed for the build gate. Worth keeping on hand for anyone manually browsing the QA store in a browser.

   These three are runtime/feature-specific (Admin RX gate, Customer Account OAuth), not part of `next build`'s prerender path (both routes stayed `ƒ` dynamic before and after), so they don't block this ticket's build gate — but they should be resolved before any ticket that exercises RX or customer-account flows against QA.

## What was and wasn't changed

- No tracked source files were edited to make gates pass. The eslint/tsc failures above were environment artifacts (untracked worktree/scratch files, stale `.next` cache) and are documented, not silently patched in `eslint.config.mjs` or elsewhere.
- `.env.local` (gitignored, never committed) now has, for the QA store: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN` (public token — see finding 6), and `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`. `SHOPIFY_ADMIN_ACCESS_TOKEN` and `SHOPIFY_CUSTOMER_ACCOUNT_URL` are still unresolved (finding 6) and left at their prior values pending clarification.
- `.next/` (gitignored build cache) was cleared.
- 4 local WebStorm language-server helper processes were terminated (user-approved) to unblock `npm ci`; WebStorm restarts these automatically as needed.

## Follow-up items for later tickets

- Get a definitive `SHOPIFY_ADMIN_ACCESS_TOKEN` for the QA store (RX gate) — the manager's OAuth client id/secret and `atkn_...` automation token are not a confirmed drop-in for this var; needs the QA custom app's actual Admin API access token.
- Get the QA store's Customer Account OAuth base in the `https://shopify.com/authentication/<shop-id>` form for `SHOPIFY_CUSTOMER_ACCOUNT_URL` — the `.well-known` discovery URL provided isn't usable as-is.
- Fix `eslint.config.mjs`'s `globalIgnores` to cover `.claude/worktrees/**` (the actual local worktree path), not just `.worktrees/**`.
- Consider pinning/documenting `corepack npm` as the required local install command so contributors match the declared `npm@10.9.3`.
- Optional: reconcile the app's hardcoded API version (`2026-04` in `lib/shopify/storefront.ts`/`admin.ts`/`customer.ts`) against the QA store's documented `2026-07` — not blocking (both versions authenticate fine with the public token), but worth a deliberate decision rather than drift.
