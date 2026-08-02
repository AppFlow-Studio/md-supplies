# Clean-Fix Final Traceability Matrix — 2026-07-30

Branch: `fix/complete-clean-fix-plan-2026-07-30`
Base: `739125c` (local main, 3 ahead of `origin/main` @ `a49df32`)
Plan: MDSupplies Developer Clean-Fix Execution Plan v1.0 (2026-07-22)

Status key: **PASS** (acceptance criteria met and evidenced) · **BLOCKED** (internal
engineering complete, external input required) · **PARTIAL** · **FAIL** · **INCONCLUSIVE**

---

| Ticket | Status | Implementation | Tests | Evidence |
|---|---|---|---|---|
| DEV-CORE-01 | **PASS** | Branch/backup discipline, fail-safe flags for shipping + RX + Fordeer, no secrets in bundles, existing CI gate retained | 1074 unit tests; `eslint --max-warnings 0`; `tsc --noEmit`; `next build` exit 0 | §QA below |
| DEV-ARCH-01 | **PASS** | Registry (`lib/category-tree.ts`) is authoritative for nav/routes; filters default-deny via `lib/filter-registry.ts`; label + policy + claims registries added | `category-tree.test.ts`, `filter-registry.test.ts`, `nav-route-integrity.test.ts` | All 25 L1 handles verified live |
| DEV-NAV-01 | **PASS** (was FAIL) | **Defect found + fixed this pass.** Needles/Syringes routed to `/categories`; layout reconciled nav against a truncated 249-of-695 collection page. Now paginated + registry-first resolution | `nav-route-integrity.test.ts` (7) | Live app: `href="/category/needles-syringes"`, route 200 |
| DEV-CAT-01 | **PASS** | Initial-letter placeholders removed from both `/categories` grids; failures degrade to neutral panel | `category-assets.test.ts` (4) | All roadmap categories have file + descriptive alt |
| DEV-CAT-02 | **PASS** | Registry-driven crawlable L2 anchors; OCC category nav now semantic `<nav>/<ul>` with 44px targets | `category-tree.test.ts` | Rendered anchors verified |
| DEV-FILTER-01 | **PASS** | Per-collection allowlist from measured coverage audit; Gloves Type=use via `product_type`, Material fails closed; raw tags default-denied | `filter-registry.test.ts` | Pre-existing, re-verified |
| DEV-FILTER-02 | **PASS** | `router.push` + URL state for filter/sort/search/pagination; no document reload | `CategoryResults.test.tsx`, `CategorySort.test.tsx`, `FilterDrawer.test.tsx` | Search adds `aria-live` count |
| DEV-SEARCH-01 | **PASS** (was NOT DONE) | Scoped search above every L1/L2/OCC grid; `?q=` server-rendered URL state; server-side scoping (tag query or collection-ID intersection); input sanitized against query injection | `category-results-source.test.ts` (14) | **Live scoping proof below** |
| DEV-OCC-01 | **PASS** w/ 1 blocked sub-item | Canonical `occ` collection; full catalog via `CategoryResults` (filters/search/sort/pagination); featured block live-sourced and labeled; guessed handles + `tag:occ` scanning + fake placeholder products removed | `occ.test.ts` | `occ` handle **verified live**; count reconciliation still needs Izzy sign-off |
| DEV-FORM-01 | **PASS** | Single env-backed `support@` recipient; honeypot, rate limiting, header-injection guards | `support-address.test.ts`, `guards.test.ts`, contact route tests | Pre-existing, re-verified |
| DEV-POLICY-01 | **PASS** (was NOT DONE) | `lib/policy/return-policy.ts` holds approved §7.2 copy verbatim; `/returns` built; PDP RETURNS tab with ARIA tab semantics, never empty; FAQ 30-day promise removed | `policy-copy.test.ts` (15) | Live `/returns` renders approved copy verbatim |
| DEV-LABEL-01 | **BLOCKED** (internal complete) | Normalized label contract (`lib/labels/labels.ts`); single backorder source shared card↔PDP; stale ETA suppressed; RX display-only; **no** free-shipping label from tags | `labels.test.ts` (11), `catalog-claims.test.ts` | Fordeer headless path unproven — provider interface + documented blocker + fail-safe flag |
| DEV-ACCOUNT-01 | **PASS** (was NOT DONE) | `fulfillmentLineItems` query; per-shipment cards (status/date/every tracking number/items/quantities); exact remaining quantities; refunded units disclosed separately | `fulfillment.test.ts` (13, all §8.4 cases) | Needs Izzy fixture for end-to-end proof |
| DEV-CATALOG-01 | **PASS** | All "In Stock" claims removed (PDP, Quick Add, Popular Products); no substitute promise; Default Title suppressed; backorder unified | `catalog-claims.test.ts` (4) | Live PDP: 0 "In Stock" occurrences |
| DEV-SHIP-01 | **PASS** | Resolver unchanged and correct; `public_display_class` only; flag disabled; **removed the card's raw `free-shipping` tag fallback** | `shipping-resolver/*` (7 files), `catalog-claims.test.ts` | Production flag stays off |
| DEV-STORE-01 | **PASS** | Cart/PDP flows intact; error boundary verified rendering a clean recoverable state with no stack trace | `CartPageClient.test.tsx`, `ProductView.a11y.test.tsx`, e2e specs | Failure state observed live |
| DEV-SEO-01 | **PASS** | Query variants (filter/sort/**q**/page) noindex + clean canonical on L1, L2, OCC; redirects/sitemap unchanged; unsourced claims removed from copy and metadata | `route-guardrails.test.ts`, `sitemap.test.ts`, `proxy.test.ts` (61) | Allowlist documents each intentional noindex |
| DEV-QA-01 | **PARTIAL** | This matrix + completion report + QA report + Izzy handoff produced. Independent human QA reviewer still required by the plan | — | See `clean-fix-qa-report-2026-07-30.md` |

---

## Live scoping proof (DEV-SEARCH-01)

Run against the dev server on the live catalog. Results invert exactly as
membership requires — the strongest available evidence that scoping is enforced
server-side rather than cosmetically:

| Query | `/category/needles-syringes` | `/solutions/occ` |
|---|---|---|
| `tuberculin` | **9 results** | 0 results |
| `syringe` | (in scope) | **0 results** |
| `backpack` | **0 results** | 9 results |
| `toothbrush` | **0 results** | 9 results |
| `zzzznotathing` | 0 results | — |

Two independent code paths are exercised: registry tag-scoping (category) and
collection product-ID intersection (OCC).

## Defects found this pass that prior audits missed

1. **DEV-NAV-01 shipping its own defect** — Needles/Syringes → `/categories`,
   caused by a truncated collection allowlist (249 of 695). Fixed + pinned.
2. **Raw `free-shipping` tag badge on product cards** — the PDP had removed this
   fallback with an explanatory comment; the card kept it. Whole
   `hasFreeShipping` path deleted.
3. **Category product route skipped metafield normalization** — passed raw
   `{ value }` objects into `ProductView` (broken spec rows / backorder date).
   Extracted `lib/shopify/normalize.ts` and applied it.
4. **Fake OCC placeholder products** — `placehold.co` images and invented prices
   presented as catalog assortment.
5. **Dead `gifts-toys` OCC category link** — no such collection exists; 404'd.
6. **Unsourced claims beyond the plan's list** — "1,000+ Active Accounts",
   "24-48 hr Fast Support", "Ships in X" lead time, ISO-certification claim,
   "respond in hours", "within 2 hours" support promise.
7. **`setState` inside an effect** in the new search input (caught by
   `--max-warnings 0`), replaced with React's render-time adjustment pattern.
