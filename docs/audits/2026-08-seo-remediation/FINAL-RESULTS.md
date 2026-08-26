# P0 Remediation — Results

**Branch:** catalog-cro-review-sardor-dev
**Starting SHA:** e21205ccdf1bda800e69a4c00d2f710a3d840603
**Final SHA:** 96aac4a (Tasks 1-4: `5aef490`, `536f76c`, `6c155f8`, `80b34e4`; plus a final-review fix wave, `96aac4a`, closing 2 Important findings — see `HANDOFF-2026-08-24.md` §2 for what they were)

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
**Result: PASS** (`npx eslint . --max-warnings 0`, clean — 0 errors, 0 warnings)

The `e2e/320px-overflow.spec.ts` unused-`expect`-import warning noted below was fixed in the final-review fix wave (commit `96aac4a`). `qa-sweep.js`'s `require()`-style import errors, seen on an earlier machine mid-session, do not appear on this repo checkout — that file is git-ignored/regenerable (`.gitignore`: `/qa-sweep.js`) and isn't tracked, so it never reaches CI's checkout either.

**Superseded (for history — this is what `npm run lint` reported before the fix wave, at commit `80b34e4`):**

```
C:\Users\sarik\WebstormProjects\md-supplies\e2e\320px-overflow.spec.ts
  1:16  warning  'expect' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

C:\Users\sarik\WebstormProjects\md-supplies\qa-sweep.js
  2:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  3:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

✖ 3 problems (2 errors, 1 warning)
```

The `qa-sweep.js` errors were a different machine's untracked local file, not a repo/CI issue — confirmed absent here via `git ls-files` and `git log --all -- qa-sweep.js` (no history at all). The `e2e/320px-overflow.spec.ts` warning was real and did fail CI's required `eslint . --max-warnings 0` job; it's fixed now.

## Summary

- Code changes (Tasks 1–3): Complete, all tests passing, TypeScript clean, build successful.
- Docs (Task 4): Complete, BASELINE.md updated with "Resolved this plan" section, FINAL-RESULTS.md written.
- Final whole-branch review (range `e21205c..80b34e4`): "Ready to merge? With fixes" — 3 Important findings (plan file untracked, resolved via `d46eb4a`; CI lint red; `REDIRECT_ENTRIES` dropping query strings on all 26 static entries). Fix wave (`96aac4a`) closed the remaining 2, scoped re-review confirmed both ADDRESSED with no new breakage, independently re-verified by the controller (tsc/eslint/vitest all clean). 8 Minor findings deferred, listed in `HANDOFF-2026-08-24.md` §2.
- Lint: clean, 0 errors/0 warnings.

## Remaining P0 items (master plan §§6-13), not in this plan's scope

- P0-01 hostname normalization — infra (Bilal)
- P0-02 global noindex removal — infra (Bilal)
- P0-07 4XX classification — the ~8,309 broken `/cdn/shop/files/*.jpg` 404s are Shopify Files/product-image data, not app code (2026-08-21 triage, Finding 6); real page-level 404s were tied to the `/collections/` gap this plan closes — re-crawl to confirm what, if anything, remains
- Everything in master-plan P1-P3 — next plan, after a post-Bilal-fix re-crawl
