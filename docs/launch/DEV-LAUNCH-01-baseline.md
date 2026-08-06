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
| Build | `npm run build` (`next build`) | 0 | Succeeded — but see caveat below. **Not yet a faithful QA-data baseline.** |

## Baseline failures discovered before implementation

1. **`npm ci` blocked by a locked file (environment, not code).** WebStorm's Tailwind CSS language-server helper processes (`tailwindcss-language-server`, `oxide-helper.js`) held `node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node` open, causing `EPERM` on unlink. Resolved by terminating those 4 background processes (user-approved) before retrying; not a code defect.

2. **`npx eslint . --max-warnings 0` failed (exit 1) on first run — environment artifacts, not tracked source.** 2 errors + 14 warnings, entirely inside:
   - `.claude/worktrees/form-antibot-geolock/**` — a live git worktree for the in-progress `worktree-form-antibot-geolock` branch. It is gitignored/untracked but **not** excluded by `eslint.config.mjs`, whose `globalIgnores` only lists `.worktrees/**`, not `.claude/worktrees/**` (the path this project's worktree tooling actually uses).
   - `qa-sweep.js` — a gitignored (`/qa-sweep.js`) local scratch script at repo root, not eslint-ignored, using `require()` (2 errors).
   Re-running with those two known-noise paths excluded confirms **tracked source lints clean (exit 0, 0 problems)**. A fresh checkout with no leftover worktrees or scratch files would pass the literal acceptance command as-is.
   **Recommendation (not applied here, per "no edits before baseline"):** add `.claude/worktrees/**` to `eslint.config.mjs`'s `globalIgnores` in a follow-up task branch, since that's the actual worktree path in use.

3. **`npx tsc --noEmit` failed (exit 2) on first run — stale generated cache, not tracked source.** Two `TS2307` errors from `.next/types/validator.ts` and `.next/dev/types/validator.ts` referencing `app/category-browse/[slug]/page.js`, a route that no longer exists in tracked source (confirmed via `git ls-files`). `.next/` is gitignored, machine-local, and was stale from a prior `next dev`/`build` run before that route was removed/renamed. Deleting `.next` (a regenerable, gitignored build-output directory — not source) and re-running gives a clean `exit 0`.

4. **`.env.local` was configured against the PRODUCTION Shopify store, not QA — a real risk, not just a gate failure.** `SHOPIFY_STORE_DOMAIN` was set to `daebb2-76.myshopify.com`, which is literally `PRODUCTION_SHOP_DOMAIN` as hardcoded in `lib/shopify/shop-guard.ts`, not `QA_SHOP_DOMAIN` (`md-supplies-qa-shipping-and-checkout.myshopify.com`). The shop-guard is specifically designed to fail closed in this situation. Per user instruction, `.env.local` was updated (original values backed up outside the repo, not committed — `.env.local` stays gitignored) to:
   - `SHOPIFY_STORE_DOMAIN=md-supplies-qa-shipping-and-checkout.myshopify.com`
   - `SHOPIFY_STOREFRONT_ACCESS_TOKEN=PLACEHOLDER_PENDING_QA_TOKEN` (real QA token pending from manager)

   With the domain corrected, the shop-guard passed, but the placeholder token produced repeated `Storefront API HTTP 401: Unauthorized` during static generation. The build still exited `0` — pages that couldn't fetch live data rendered dynamically (`ƒ`) instead of the intended static/ISR (`○`) — so **exit 0 is not yet a fully faithful QA-data build.** Re-run this gate once the manager provides a real QA Storefront access token to get a build that actually exercises ISR against live QA data, and update this report with that result before other DEV-LAUNCH tickets treat this build result as final.

5. **Turbopack tracing warning (informational, non-blocking).** `next.config.ts` → `lib/shipping-resolver/data.ts` → `lib/shipping-resolver/resolve.ts` triggers "Encountered unexpected file in NFT list" because of dynamic `fs`/`path` usage in the shipping-resolver data loader. Did not fail the build; noted for awareness only.

## What was and wasn't changed

- No tracked source files were edited to make gates pass. The eslint/tsc failures above were environment artifacts (untracked worktree/scratch files, stale `.next` cache) and are documented, not silently patched in `eslint.config.mjs` or elsewhere.
- `.env.local` (gitignored, never committed) was updated to point at the QA store domain with a placeholder Storefront token, per explicit user instruction, pending real QA credentials.
- `.next/` (gitignored build cache) was cleared.
- 4 local WebStorm language-server helper processes were terminated (user-approved) to unblock `npm ci`; WebStorm restarts these automatically as needed.

## Follow-up items for later tickets

- Get the real QA Storefront access token from the manager and re-run `npm run build`, replacing the placeholder-token result above.
- Fix `eslint.config.mjs`'s `globalIgnores` to cover `.claude/worktrees/**` (the actual local worktree path), not just `.worktrees/**`.
- Consider pinning/documenting `corepack npm` as the required local install command so contributors match the declared `npm@10.9.3`.
