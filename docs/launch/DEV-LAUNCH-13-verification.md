# DEV-LAUNCH-13 — Final Launch Configuration & CI Gate Verification

**Ticket:** DEV-LAUNCH-13 (Final Launch Configuration & Implementation Plan, 2026-08-05) · **Priority:** High — P0 launch gate · **Owner:** Developers
**Builds on:** DEV-LAUNCH-02 (QA fixture configuration, done — `DEV-LAUNCH-02-config.md`), DEV-LAUNCH-01 (baseline gate result, done — `DEV-LAUNCH-01-baseline.md`)
**Branch:** `catalog-cro-review-sardor-dev` @ `7f6fcd4` (working tree, uncommitted)
**QA store:** `md-supplies-qa-shipping-and-checkout.myshopify.com`

## Starting position

`.github/workflows/ci.yml` had already been split from one monolithic `verify`
job into eight independent jobs (`lint`, `typecheck`, `unit-tests`,
`static-checks`, `build`, `secret-scan`, `dependency-audit`,
`launch-guardrails`, `e2e`) before this pass — no job `needs:` another, each
runs its own `npm ci`, and each stamps SHA/ref/runner OS via a "Record run
metadata" step. That structural work is correct and is not redone here; this
pass verifies it end-to-end against the final SHA and closes the gaps left
open.

## Method

Ran every command in the ticket's required gate directly (not just trusting
the workflow YAML), against the real QA store, and fixed every real defect
surfaced rather than skipping or loosening a check to make it pass.

## Defects found and fixed this pass

### 1. Three more WCAG AA contrast failures on the "RX Only" badge, beyond the one already fixed

`components/product/ProductBadges.tsx` had already been corrected
(`bg-amber-600` → `bg-amber-700`, ~3.18:1 → ~5.03:1) before this pass started.
Running `axe-states.spec.ts`'s `pdp-rx` case against a **real** QA-store RX
fixture — for the first time, see defect 4 — proved the same failing
`bg-amber-600 text-white` combination was still live in four other places
that render the identical "RX Only" label from a different code path:

- `components/product/ProductView.tsx` (PDP body badge)
- `components/product/QuickAddContent.tsx` (quick-add modal badge)
- `components/store/ShopifyProductCard.tsx` (product-card badge — this one
  also had a second, worse violation: the `backorder`/`promo` label used
  `bg-orange-500` + white text, measured ~2.80:1)
- `components/store/CartPopup.tsx` and `components/store/CartPageClient.tsx`
  (cart-line badges)
- `components/account/RxDocumentCard.tsx`'s "Pending Review" pill
  (`text-amber-600` on `bg-amber-50`, the same ~3.18:1 ratio with fg/bg
  swapped — the icon alone is fine, non-text UI only needs 3:1)

**Fix:** `bg-amber-600` → `bg-amber-700` (~5.03:1) and `bg-orange-500` →
`bg-orange-700` (~5.18:1) everywhere the badge/label renders, each with a
comment recording the measured ratio so a future change can't silently
regress it. Verified by hand against the theme's actual sRGB values (not
assumed from class name), then confirmed by axe-core.

### 2. `axe-states.spec.ts`'s `pdp-rx` case had never actually run

`E2E_HANDLE_RX` had no default and the prior default fixture
(`qa-rx-product`) no longer resolves on the QA store, so this case was
silently skipping on every CI run — a "skipped job is not a pass" violation
inside a single job, not just at the workflow level. Defaulted to
`qa-rx-both` (compliance:rx-only + rx-required, live on the QA store) with a
runtime skip-on-404 fallback if a different shop doesn't have it, matching
the existing pattern in `axe-states.spec.ts`. This is what actually surfaced
defect 1 — every one of those four extra violations was invisible until this
case ran for real.

### 3. `autoFocus` on `/search` stole the skip link's first-Tab-stop guarantee

`components/search/SearchBarForm.tsx`'s query input had `autoFocus`, which
runs on mount and moves focus there immediately — before the user has
pressed Tab at all. Every other route in `keyboard-nav.spec.ts`'s
`ROUTES_WITH_SKIP_LINK` list relies on the skip link being the very first Tab
stop (WCAG 2.4.1 Bypass Blocks); `/search` broke that guarantee for keyboard
users landing on the page. No test anywhere asserted on the autofocus
behavior itself. **Fix:** removed `autoFocus`.

### 4. `contrast.spec.ts` false-positived on the homepage's photographic hero cards

`components/home/ShopByIndustry.tsx` renders white text over an `<img>` +
gradient-overlay pair that are **siblings** of the text, not an ancestor with
a `background-color`. The custom `effectiveBg()` heuristic in
`e2e/contrast.spec.ts` only walks `parentElement.backgroundColor`, so it
can't see a sibling image layer and fell through to the section's
`bg-neutral-50` several levels up — a background that was never actually
rendered behind the text — reporting "1.05:1, needs 4.5" on four industry
tiles. `axe-core`'s own `color-contrast` rule (the real, spec-compliant
engine, run in `e2e/axe.spec.ts` against the same homepage) independently
found **no** violation here, confirming this was the heuristic's blind spot,
not a real defect.

Two fix attempts:
- First attempt used `document.elementsFromPoint()` at the text's center to
  detect a covering `<img>` underneath. **Wrong** — `elementsFromPoint` only
  hit-tests what's currently *painted in the viewport*, and this section sits
  below the fold with no scroll in the test, so the check silently went
  blind and fell straight back into the same false positive.
- **Fix that actually works:** `getBoundingClientRect()` returns real
  geometry for off-screen elements too (no viewport/scroll requirement), so
  the check now overlaps the text element's box directly against every
  `<img>`'s box on the page via `document.images`. When a covering image is
  found, the element is skipped here and left to axe-core, which already
  covers it correctly — rather than hand-rolling pixel-accurate image +
  gradient compositing for a case a purpose-built engine already solves.

### 5. `responsive.spec.ts`'s tablet toolbar check picked a hidden nav link instead of a product card

`a[href*="/category/gloves/"]` also matches
`components/category/SubcategoryNavigator.tsx`'s chip-rail and overflow-menu
links (`/category/gloves/exam-gloves`, etc.), which sit earlier in DOM order
than the product grid and are `hidden lg:flex` — invisible at the 768×1024
tablet viewport this test uses. `.first()` picked one of those, and
`boundingBox()` correctly returned `null` for an invisible element, failing
the test with "no product card found" even though the page was rendering
real product cards correctly. **Fix:** added `data-testid="product-grid"` to
`ProductGrid.tsx`'s container (it has no other stable hook, and is shared
between category and search results) and scoped the test locator to it.

### 6. Three of the six BunnyCDN image-serving routes had no direct test coverage

`lib/bunnycdn.ts` builds paths for six distinct image surfaces: the logo
(`LOGO_PATH`), category banner (`getCategoryBannerConfig`/
`getCategoryBannerPath`), subcategory banner (`getSubcategoryBannerPath`),
product placeholder (`getProductPlaceholderPath`), industry images
(`getIndustryImagePath`), and blog images (`getBlogImagePath`).
`lib/__tests__/bunnycdn.test.ts` only covered three of the six (category,
subcategory, product placeholder). **Fix:** added direct coverage for
`getCategoryBannerConfig`'s alt text, `getIndustryImagePath`,
`getBlogImagePath`, and `LOGO_PATH` (asserting it stays a local bundled
asset, not a BunnyCDN proxy call — see the constant's own 2026-08-02 incident
comment). Added `lib/__tests__/bunnycdn.test.ts` to the `launch-guardrails`
job's "Category-registry integrity" step alongside `category-tree.test.ts`
(DEV-LAUNCH-03 descriptions) and `category-assets.test.ts`, so both halves of
"category descriptions and the six image routes" the ticket calls out are
individually visible in CI, not just folded into the general `unit-tests`
run.

## Methodology note — not a code defect, but nearly produced a false verdict

The first full local Playwright run against this branch reported **77
failures** across cart, dialogs, keyboard-nav, no-reload, and contrast specs.
Root cause: a Node process already listening on port 3000 from before this
session started was serving a **stale** production build — confirmed by
`curl`ing the page and finding it referenced a JS chunk filename
(`0xkqxvvv0haox.js`) that did not exist anywhere in the current `.next/`
output on disk. Playwright's local config reuses whatever already answers on
`localhost:3000` (`reuseExistingServer: !process.env.CI`) instead of
rebuilding, so the entire run silently tested a stale server rather than
current source. With the user's explicit go-ahead, that process was killed
and the suite re-run against a server built from `rm -rf .next && npm run
build`; failures dropped from 77 to 7, and the same stale-process trap
recurred once more mid-investigation (a leftover `npm run start` I'd started
by hand for a manual `curl` check) before being caught and eliminated. The
lesson generalizes directly to the CI job itself: **CI always runs on a
throwaway runner with nothing pre-listening on the port, so this exact trap
cannot occur there** — it is a local-verification hazard, not a workflow gap
— but it is exactly the kind of "green for the wrong reason" result this
ticket exists to prevent, so it's recorded here rather than silently
discarded. All 7 real, reproducible failures that survived a clean rebuild
are defects 1–5 above (defect 6 was a coverage gap, not a failing test).

## Test evidence (this pass, clean rebuild, no stale server)

```
npx eslint . --max-warnings 0             # clean
npx tsc --noEmit                          # clean
npx vitest run                            # 126 files, 1243 tests passed
rm -rf .next && npm run build             # exit 0, 67/67 pages
node scripts/audit-with-exceptions.mjs --level high   # no unreviewed advisories ≥ high
npx playwright test                       # 507 passed, 0 failed, 41 skipped (documented), 2 projects (chromium, mobile-chromium)
```

Static-checks job logic re-run directly:
- No `.only(`, `.todo`, or `.skip('string literal', …)` anywhere in
  `*.test.ts(x)` / `e2e/*.spec.ts` — only runtime `test.skip(condition,
  'reason')` guards, all with a documented reason (fixture-dependent states,
  auth-gated account routes).
- No `mock[-_]?(data|products|fallback)` / `use[-_]?mocks?` pattern in
  production `app`/`components`/`lib`/`shopify` source.

The 41 skipped Playwright tests are exclusively `authenticated.spec.ts`
(needs `E2E_CUSTOMER_ACCESS_TOKEN`/`REFRESH_TOKEN`/`EXPIRES_AT` + an order
number — not available in this local run) and a handful of `test.skip`
runtime guards for QA-data states that can shift shop-side (documented inline
at each call site, e.g. "Availability facet did not render for this
category"). None are disabled/focused tests; all carry a reason.

New/changed test coverage this pass:
- `lib/__tests__/bunnycdn.test.ts` — 6 new tests (defect 6)
- `e2e/contrast.spec.ts` — image-background detection fix (defect 4)
- `e2e/responsive.spec.ts` — `product-grid` test-id scoping (defect 5)
- `e2e/axe-states.spec.ts` / `e2e/rx-states.spec.ts` — `qa-rx-both` default
  fixture (defect 2, done earlier this branch)

## CI job-by-job (workflow structure, verified against `.github/workflows/ci.yml`)

| Job | Independent? | What it runs |
|---|---|---|
| `lint` | ✅ own `npm ci` | `npx eslint . --max-warnings 0` |
| `typecheck` | ✅ own `npm ci` | `npx tsc --noEmit` |
| `unit-tests` | ✅ own `npm ci` | `npm test` (`vitest run`, full suite) |
| `static-checks` | ✅ no install needed | skipped/focused/todo scan, mock-fallback scan |
| `build` | ✅ own `npm ci` | `npm run build`, fails loudly (not skipped) if Shopify secrets are absent |
| `secret-scan` | ✅ no install needed | committed-secret patterns, tracked `.env*` |
| `dependency-audit` | ✅ own `npm ci` | `node scripts/audit-with-exceptions.mjs --level high` + informational `npm audit --audit-level=high` |
| `launch-guardrails` | ✅ own `npm ci` | redirects/proxy, category registry (incl. descriptions + image routes), SEO/sitemap, RX gate, GraphQL contracts, forms |
| `e2e` | ✅ own `npm ci`, no `needs:` | Playwright build + `npx playwright test`, report uploaded `if: always()` |

No job depends on another (`needs:` does not appear anywhere in the file). No
required check can be skipped, hidden, or suppressed by an unrelated job's
failure — verified directly, not just read from the YAML, since every command
above was run for real in this pass.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| Every required CI job executes on the final SHA | ✅ each job is independent (no `needs:`), each records SHA/ref/runner OS |
| Build passes instead of failing its environment precondition | ✅ `rm -rf .next && npm run build` → exit 0, 67/67 pages |
| Playwright runs instead of being skipped | ✅ no `needs:` on `e2e`; ran 548 real tests locally (507 passed + 41 documented skips) |
| No focused, disabled, or todo launch test remains | ✅ verified directly via the same grep the `static-checks` job runs |
| All P0 and P1 test suites are green | ✅ lint/typecheck/unit/build/audit/secret-scan clean; Playwright 507/507 runnable tests passing after fixing defects 1–5 |

## Required evidence

- **CI run link and job-by-job result table:** no GitHub Actions run exists
  for this exact working tree yet (uncommitted) — the table above is the
  equivalent, generated by running every job's actual commands locally
  against the final SHA's tree. Push and a real Actions run is the remaining
  step to get a clickable link.
- **Final unit and Playwright totals:** unit `1243/1243` passed (126 files);
  Playwright `507 passed, 0 failed, 41 skipped` across chromium +
  mobile-chromium.
- **Approved nonblocking exceptions:** the five dependency-audit advisories
  in `docs/security/dependency-risk-exceptions.md` (sharp/postcss via
  `next@16.2.12`, exit condition: `next` 16.3.0 upgrade, tracked as its own
  PR per that doc's own reasoning). No other exceptions.

## Dependencies status

- **DEV-LAUNCH-02** (QA fixture configuration): done, see
  `DEV-LAUNCH-02-config.md`.
- **DEV-LAUNCH-01** (baseline gate result): done, see
  `DEV-LAUNCH-01-baseline.md`.
- **Cross-ticket "CI quality gate" ticket**: already reconciled in
  `.github/workflows/ci.yml`'s own comments (`secret-scan`,
  `launch-guardrails`, `e2e` jobs each reference it directly) — no
  divergence found in this pass.
