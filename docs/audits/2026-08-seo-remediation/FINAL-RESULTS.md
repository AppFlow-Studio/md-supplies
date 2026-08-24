# P0 Remediation — Results

**Branch:** catalog-cro-review-sardor-dev
**Starting SHA:** e21205ccdf1bda800e69a4c00d2f710a3d840603
**Final SHA:** 6c155f82aa7630c3f2ef62775e7a063e2c1a8a6a (this is the final code SHA from Task 3; docs commits follow)

## What this plan fixed (code)

| Item | Before | After |
|---|---|---|
| `/collections/<handle>` L1-category coverage | 2 of 25 categories (hardcoded Set) | All 25 categories, both `tag` and `collectionHandle` forms, via `lib/category-tree.ts` registry |
| `/collections/<any>/products/<handle>` | Fell through to pass-through (404 downstream) | One-hop 301 to canonical `/product/<handle>`, routed through the existing `PRODUCT_REDIRECTS`/`LEGACY_PRODUCT_HANDLES` maps |
| `/bariatricproducts` | Unhandled — fed the apex/www redirect loop | One-hop 301 to `/category/bariatric` |
| Redirect regression coverage | Per-rule tests only | + a general no-chain/no-loop sweep over all static entries and both category registries |

## What this plan did NOT fix (not code)

Apex↔www redirect direction and sitewide `www` `noindex,nofollow` — both Vercel/Cloudflare dashboard configuration, handed off in `BILAL-HANDOFF.md`. Per the 2026-08-21 triage, these two likely explain the majority of the audit's remaining row counts; re-crawl after they land before scoping the next (P1) plan.

## Verification

### npm test
**Result: PASS** (147 test files, 1590 tests)

```
RUN  v4.1.8 C:/Users/sarik/WebstormProjects/md-supplies

 Test Files  147 passed (147)
      Tests  1590 passed (1590)
   Start at  17:15:21
   Duration  31.78s (transform 8.52s, setup 10.73s, import 44.61s, tests 22.85s, environment 85.00s)
```

All tests passing at 100%.

### npx tsc --noEmit
**Result: PASS** (clean, no output)

No type errors. TypeScript compilation clean.

### npm run build
**Result: PASS** (successful build)

Next.js build completed successfully with all routes listed and prerendered/dynamic states correct.

### npm run lint
**Result: FAIL** (pre-existing, out of scope)

```
C:\Users\sarik\WebstormProjects\md-supplies\e2e\320px-overflow.spec.ts
  1:16  warning  'expect' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

C:\Users\sarik\WebstormProjects\md-supplies\qa-sweep.js
  2:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  3:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 3 problems (2 errors, 1 warning)
```

**Status:** 2 pre-existing errors in `qa-sweep.js` (QA screenshot utility, lines 2–3 use `require()` style imports) and 1 pre-existing warning in `e2e/320px-overflow.spec.ts` (unused `expect` import, line 1). Both files are outside this plan's scope — confirmed via Tasks 1–3 diffs, which touched only `proxy.ts` and `__tests__/proxy.test.ts`. These lint issues were present at the plan's starting point (commit e21205c) and are not code changes this plan introduced or needs to fix in a docs-only task. Flagged for a future cleanup pass; not a blocker for this remediation plan's completion.

## Summary

- Code changes (Tasks 1–3): Complete, all tests passing, TypeScript clean, build successful.
- Docs (Task 4): Complete, BASELINE.md updated with "Resolved this plan" section, FINAL-RESULTS.md written.
- Lint: 2 pre-existing errors in utility files (qa-sweep.js) and 1 pre-existing warning in e2e test (320px-overflow.spec.ts), both outside plan scope, documented transparently per master plan §33.K.

## Remaining P0 items (master plan §§6-13), not in this plan's scope

- P0-01 hostname normalization — infra (Bilal)
- P0-02 global noindex removal — infra (Bilal)
- P0-07 4XX classification — the ~8,309 broken `/cdn/shop/files/*.jpg` 404s are Shopify Files/product-image data, not app code (2026-08-21 triage, Finding 6); real page-level 404s were tied to the `/collections/` gap this plan closes — re-crawl to confirm what, if anything, remains
- Everything in master-plan P1-P3 — next plan, after a post-Bilal-fix re-crawl
