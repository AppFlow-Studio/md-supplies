## Task 7: Free Shipping display verification across all 7 surfaces (read-only, no Shopify writes)

**Files:**
- Read/extend: `scripts/report-free-shipping-exceptions.ts` (existing read-only reporting script — confirmed to exist; extend rather than rewrite)
- Read: `lib/shipping-resolver/free-shipping-gate.ts`, `lib/shipping-resolver/resolve.ts`, `lib/shipping-resolver/copy.ts`
- Read/verify: `ProductView.tsx`, `components/product/ShippingBadge.tsx`, `components/product/ShippingBlock.tsx`, `components/store/ShopifyProductCard.tsx`, `components/store/CartPopup.tsx`, `components/store/CartPageClient.tsx`, `components/home/PopularProducts.tsx` — plus confirm Quick Add and the (now-fixed, Task 4) You May Also Need cards independently
- Output: a findings doc, `docs/launch/2026-08-18-free-shipping-verification.md`

**Interfaces:**
- Consumes: whatever public function `free-shipping-gate.ts` exports (read it first — do not assume a name) as the single AND-gate; every surface must call through it, never re-implement the AND logic locally

This task is verification, not implementation — Bilal's OCC/Dukal/Trocar/Kadara *rule content* is Izzy's write, out of scope here (Global Constraints). Sardor's job is confirming every display surface obeys the existing AND-gate and flagging any surface that shows the badge off the metafield alone.

- [ ] **Step 1: Read the AND-gate implementation**

Read `lib/shipping-resolver/free-shipping-gate.ts` fully. Confirm in writing (in the findings doc) that it requires both the merchant metafield AND a resolver-confirmed $0 rate before returning a "show badge" result, with the exact function signature and the two specific checks it performs (quote the lines).

- [ ] **Step 2: Grep every display surface for independent badge logic**

`grep -rn "free_shipping\|freeShipping\|shippingDisplay\|FreeShipping" components/ app/` — for each hit, confirm it either (a) reads a pre-computed `shippingDisplay`/`ShippingDisplay` value that was itself produced by the gate (safe), or (b) independently checks the raw metafield without going through the gate (a bug — flag it explicitly by file:line in the findings doc, do not fix it in this task unless it's a one-line obvious call-site swap; if it's structural, write it up as a separate task and stop).

- [ ] **Step 3: Confirm PDP + Quick Add + You May Also Need render the same resolved value as the category/search card for the same product**

Write a focused test (or extend an existing one) in `ProductView.test.tsx` and the category-card test file asserting that for a fixture product with `shippingDisplay: { eligible: true, confirmed: false }` (gate says no) and one with `{ eligible: true, confirmed: true }` (gate says yes), no surface shows the badge in the first case. Run and confirm pass with the current code (this test should already pass if the resolver is correctly the single source — a fail here means a real bug to fix, following the TDD steps from Task 4-6's pattern).

- [ ] **Step 4: Verify against real QA data for one example per rule**

Using the existing read-only verify-script pattern (`NODE_OPTIONS='--conditions=react-server' npx tsx scripts/<script>.ts` against `.env.local`'s QA store), spot-check: one Dukal product inside OCC (expect badge), one Dukal product outside OCC under $30 (expect no badge), one Trocar Supplies product (expect badge, unless it's one of Izzy's named "3 currently missing the flag" — cross-reference against her list), one Kadara product from the Trocar registry CSV (expect no badge). Record actual observed results, including any merchant-rule-vs-resolver disagreement, in the findings doc — do not fix disagreements (Izzy's writes), just report them precisely (product ID/handle + what was expected vs. observed).

- [ ] **Step 5: Write the findings doc**

`docs/launch/2026-08-18-free-shipping-verification.md` — structured per surface (PDP / category card / search card / Quick Add / You May Also Need / cart popup / cart page / checkout), pass/fail/not-applicable for each, plus the spot-check results from Step 4.

- [ ] **Step 6: Commit**

```bash
git add docs/launch/2026-08-18-free-shipping-verification.md <any test files touched>
git commit -m "docs(shipping): verify Free Shipping AND-gate across all 7 display surfaces"
```

---

