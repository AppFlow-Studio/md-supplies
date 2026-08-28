# Launch remediation — Devs-owned status (2026-08-14)


All work below is **committed locally, not pushed and not deployed**. Per the plan's own Appendix D, a gate is formally "Complete" only once its acceptance criteria pass on the exact production deployment (LG-06) — everything marked ✅ here is dev-environment evidence, ready for that step, not a final sign-off.

## Completed

### Pre-existing blocker: `lib/filter-registry.ts` build break — ✅ Fixed
Not part of the launch plan, found while trying to build/test the branch. A botched PR merge (PR #58's rewrite reverted by PR #59's merge) left `Cannot find name 'withUniversal'` and misplaced the industry facet registry, breaking `npm run build`, `tsc`, and 9 test suites.
- **Evidence:** already fixed and verified independently on `origin/main` (commit `f5149ca`, PR #60) — cherry-picked rather than re-derived.
- **Commit:** `86ad1d9`
- **Verification:** `tsc --noEmit` 0 errors, `npm run build` succeeds, 138/138 test files passing (up from 129/138).

### LG-03 — Synchronize the complete selected-variant identity (P0, launch gate) — ✅ Done, evidenced
Selecting a different variant (e.g. Red vs Blue) now updates SKU, H1, breadcrumb, media, URL, canonical URL and structured data together, on both PDP routes. Fixes the exact defect the plan's own Figure 5 documented.
- **Evidence:** [LG-03 Evidence Record](https://claude.ai/code/artifact/af0f268d-96bc-45f0-a304-8a1458c96eef) — 5 screenshots against real Shopify data (product: `3-wheel-rollator-rolling-walker-with-basket-tray-and-pouch-flame-blue`, the plan's own Figure 5 example), acceptance-criteria checklist, structured-data proof (curl output showing `ProductSchema.sku` follows the selected variant, canonical stays neutral), test output.
- **Commits:** `412545c` (implementation), `ae3ff04` (e2e spec completed and verified — found and fixed two Playwright locator bugs in the process).
- **Verification:** component/unit tests passing, `e2e/variant-identity.spec.ts` 4/4 passing (both PDP routes × desktop/mobile) against a live dev server.
- **Deliberately out of scope:** variant-level manufacturer number/description/order-unit overrides (no Shopify metafield contract agreed with Izzy yet); `ProductGroup` structured data (plan marks it optional, "where implemented").

### H-03 — Sort category/filter values naturally (P1) — ✅ Done, tested
Filter groups and the subcategory sibling nav now sort by natural numeric-then-alphabetic label order instead of live result count, matching the plan's Figures 10/11.
- **Commit:** `406b061`
- **Evidence:** `lib/__tests__/facet-order.test.ts` — includes the plan's own fixture examples (0/1-0/2-0…10-0, 20G/22G/23G, ABD Pads vs Adhesive Bandages), all passing.

### H-04 — Backorder/ETA behavior and exact "Rx Only" copy (P1) — ✅ Partially done
- "Rx Only" capitalization fixed everywhere (was "RX Only") — single source of truth in `lib/labels/labels.ts`, propagates to every live surface (cards, PDP, Quick Add, cart, accessibility copy).
- New regression test proving Backorder status structurally cannot gate Add to Cart (`components/product/__tests__/AddToCartButton.test.tsx`) — purchasability is price/availability only.
- Boolean-is-the-sole-gate and ETA-never-creates-Backorder were already covered by existing tests; no change needed.
- **Commit:** `cece4a6`
- **Deliberately NOT changed:** the plan's Backorder truth table wants a valid future ETA displayed ("Backorder plus estimated restock date"). The shipped code has a heavily-tested "final business rule" (`DEV-SHIP-04`) that always renders exactly "Backorder," no date — and the matching copy fix (`5d1a010`) is still awaiting Izzy's re-confirmation on DEV-LAUNCH-14. **Confirmed with the user directly: keep current no-ETA behavior.** This conflict should go back to whoever owns that call (Bilal/Juliette) before it's revisited.

## Not completed

| Item | Priority | Why |
|---|---|---|
| **LG-04** — order-unit/packaging display | P0, launch gate | `ProductView.tsx` already tries to render packaging fields, but `GET_PRODUCT` never queries them — a prior session deliberately left them unfetched ("needs review rather than a quiet switch-on," comment in `lib/shopify/queries/products.ts`). Only 1 of 3 metafield keys (`order_size` → `custom.order_size`) is confirmed anywhere in the repo. **Confirmed with the user: skip for now** rather than fetch the one known field or guess the other two. |
| **LG-06** — deploy & production acceptance | P0, launch gate | No deploy/Vercel access this session. Also the plan's own explicit human-confirmed step — not something to do autonomously regardless of access. |
| **H-01** — Vendor Shipping & Returns from Shopify data | P1 | Requires live Shopify Admin metafield discovery on a known product. This app does have an Admin API client (`lib/shopify/admin.ts`), but it's explicitly scoped to customer RX metafields only ("new Admin needs get their own review, not a ride on this client") — no product/metafield read scope. Not attempted. |
| **H-02** — Free Shipping workbook validation (dev half) | P1 | Blocked on Izzy's Drive/non-Drive workbook writes landing first. |
| **S-01** — Residual catalog exceptions | P2 | Izzy-dependent. |
| **LG-01, LG-02, LG-05** — manufacturer number restoration, family reconstruction, Backorder export/reset | P0, launch gates | Izzy's Shopify catalog/data work — out of scope for this session per the user's explicit instruction; requires Shopify Admin access and business judgment this session doesn't have. |

## Verification summary (current branch state)

```
tsc --noEmit -p .                → 0 errors
npm run lint                     → clean
npx vitest run                   → 139/139 test files, 1435/1435 tests passing
npm run build                    → succeeds
E2E_BASE_URL=... npx playwright test e2e/variant-identity.spec.ts
  --project=chromium --project=mobile-chromium
                                  → 4/4 passing
```

## Commits (pushed)

```
ae3ff04  test(catalog): complete and verify the LG-03 variant-identity e2e spec
cece4a6  fix(catalog): exact "Rx Only" capitalization; prove Backorder never gates purchasability (H-04)
406b061  feat(catalog): sort filter/category values naturally instead of by count (H-03)
412545c  feat(catalog): synchronize selected-variant identity across both PDP routes (LG-03)
86ad1d9  fix(catalog): repair botched merge in lib/filter-registry.ts
```
