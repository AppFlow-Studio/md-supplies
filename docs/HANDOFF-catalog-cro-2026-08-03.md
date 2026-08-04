# Handoff — Catalog / CRO remediation

**Read this first.** It is the entry point for everyone picking up this branch.
Branch `fix/catalog-cro-remediation-2026-08-02` · base `8ce74a5` ·
Draft [PR #1](https://github.com/BilalA99/md-supplies/pull/1).

Nothing here is merged. **No Shopify writes have been performed by this work.**

Owners: **Izzy** (Shopify Admin) · **codebase devs** (Next.js/storefront) ·
**QA** (edge cases + user flows) · **Bilal/client** (decisions).

---

## 1. What this branch actually is

Two passes of work on the live catalogue/CRO problems, plus an independent
re-verification pass that treated the first pass's own report as a claim to
check rather than a result to accept. That re-verification found four real
defects and two false statements in the earlier reporting — both are corrected
in [`FINAL-REPORT.md`](audits/2026-08-02-catalog-cro/FINAL-REPORT.md), which is
the authoritative record and supersedes every other report in that folder.

The short version of what changed:

| Area | What happened |
|---|---|
| **Brand / vendor** | Shopify `vendor` is the **fulfilling** vendor, not a consumer brand — it disagrees with brand on 3,790 active products. It is now never shown as Brand, never a filter facet, and never a filter *input*. Public brand = `custom.brand_name` or nothing. |
| **RX** | The account/document checkout gate is restored as the **default**. Detection is the UNION of the `compliance:rx-only` tag and `custom.is_rx_only`, because the tag alone missed **40 active prescription products**. |
| **Catalog UX** | Search above products, sort separated from the filter rail, only CATEGORY expanded by default, quick-add moved into the card footer (44×44, off the product image). |
| **Industries** | Only 5 of 12 requested pages have a real assortment. The rest are noindexed and delisted rather than published as thin doorways. |
| **Labels** | Fordeer cannot feed a headless storefront (theme app embed, not data). Replaced with a Shopify-native metaobject the client edits themselves. |
| **CSP** | A nonce-less chunk was being blocked by `strict-dynamic` on the blog routes. Root-caused and fixed without weakening the policy. |
| **Accessibility** | Six genuine WCAG AA contrast failures fixed; semantic `--color-ink-*` tokens introduced; regression suites added. |
| **CI** | The dependency audit and secret scan were *steps* that could block build/E2E from ever reporting. Both are now independent jobs. |

### Non-negotiables that must survive future work

These are constraints, not preferences. Breaking one silently reintroduces a
defect this branch exists to fix.

1. **Never render Shopify `vendor` as a customer-facing Brand.** Use
   `publicBrand()` in `lib/brand.ts`. When there is no approved brand, render
   nothing — never fall back.
2. **Never re-add `productVendor` to the filter INPUT allowlist**
   (`lib/filter-registry.ts`). Denying the *facet* is only half the gate.
3. **Never narrow RX detection.** Detection lives in `isRxProduct()` /
   `resolveRxLabel()` only. Do not re-implement it inline. The union may widen,
   never narrow.
4. **A promotional label can never create a shipping or RX promise.** "Free
   Shipping" renders only from the shipping resolver; "Rx Only" only from RX
   policy.
5. **Never publish an indexable industry page with zero products.**
6. **Never `unsafe-inline` / `unsafe-eval` / drop `strict-dynamic`** to fix a CSP
   error. `e2e/csp.spec.ts` will fail you.
7. **SKU is never an identity** — 3,166 SKUs span more than one product. Use the
   product GID.

---

## 2. Current state — what is proven and what is not

### Proven
- `npm ci` · `tsc` · `eslint --max-warnings 0` · `npm test` (**1,148 passing**) ·
  `npm run build` — all exit 0 locally.
- Hosted CI: **secret scan, dependency audit and launch guardrails all pass.**
- CSP **12/12**, axe states **8/8**, contrast **10 passed**, responsive sweep
  **56/56** (8 routes × 7 viewports, no horizontal overflow, exactly one h1).
- July-7 catalogue baseline reproduced **exactly**, independently, twice.

### NOT proven — this is the real launch blocker
**No product-dependent surface has been verified against a shop with real
catalogue data, anywhere.** Not locally, not in CI.

- Locally the shop guard (`lib/shopify/shop-guard.ts`) correctly refuses to let a
  QA build reach production — working as designed.
- The QA store has 18 fixtures, one collection, and **no RX product**.
- Hosted CI cannot build because the fork lacks Shopify Actions secrets.

So the category/industry grids, the no-document-reload guarantee and the RX
account/document walkthrough are **unexercised**. They are the highest-risk
surfaces in this change. Closing that is what §3 and §5 are for.

---

## 3. Work package A — Izzy (Shopify Admin)

Ordered. Each item is independently reversible; **do not batch them into one
operation**.

### A0. Unblock the pipeline (do these first — minutes, not hours)

| # | Task | Why |
|---|---|---|
| A0.1 | Add `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_ACCESS_TOKEN` to Actions secrets on `BilalA99/md-supplies` (Settings → Secrets and variables → Actions) | Hosted Build and E2E cannot run without them. This is the single highest-value action on the list — it unblocks E2E against real catalogue data. Repo settings only, not a Shopify change. |
| A0.2 | Grant the QA custom app: `read_products`, `write_products`, `read_inventory`, `write_inventory`, `read_locations`, `read_publications`, `write_publications` (+ `read/write_metaobjects` for metaobject fixtures) | The QA Admin token currently grants **only** `shop` and `metafieldDefinitions`. Everything else is `ACCESS_DENIED`, and the `atkn_` token 401s. This blocks the QA fixture package, the RX walkthrough and grid E2E. |
| A0.3 | Add **one RX fixture** to the QA store (one tag-only, one metafield-only ideally) | The QA store contains no RX-flagged product, so the gate cannot be exercised end-to-end even with scopes. |

Once A0.2 lands, run the pre-write snapshot **before** creating anything:

```bash
node scripts/qa-fixtures-export.mjs
```

It is dual-gated — it refuses unless the env names the QA shop **and** Shopify
independently confirms the token authenticates to it. It writes the rollback
source. Do not create fixtures before it succeeds.

### A1. Product labels (replaces Fordeer)

Full step-by-step, field-by-field: [`fordeer-replacement.md`](fordeer-replacement.md).

The code is **already in place and inert**. It activates the moment the two
definitions exist — no code change, no deploy.

1. Create the `product_label` **metaobject** definition.
2. Create the `custom.product_labels` **product metafield**
   (`list.metaobject_reference` → `product_label`).
3. **Enable Storefront access on both**, or the storefront reads nothing and
   fails closed.
4. Verify with `node scripts/labels-detect-definitions.mjs` (read-only).
5. Assign labels with `node scripts/labels-assign-dryrun.mjs <csv>` — **dry run
   first**; it emits a rollback file before anything is applied.

Context for why Fordeer can't work here: it stores rules in its own DB and
renders through a **theme app embed**, which a headless Next.js storefront never
loads. That is why its dashboard shows "App embed: On, 0 active app blocks".

### A2. Industries (metaobject architecture)

Full spec: [`industry-architecture.md`](industry-architecture.md).
Current-vs-proposed data: [`industry-matrix.md`](audits/2026-08-02-catalog-cro/industry-matrix.md).

1. Create the `faq_entry` and `industry` metaobject definitions.
2. Create the `custom.industries` product metafield.
3. Create **one automated collection per approved industry**, condition:
   `custom.industries` contains *(the industry metaobject)*.
4. Apply assignments from the dry-run output.

Division of responsibility, and it matters: the **metaobject owns page CONTENT**
(copy, SEO, FAQ, CTAs); the **automated collection owns PRODUCTS**, so industry
pages inherit the shared discovery system (filters, sort, pagination, counts)
instead of a hand-picked six.

Regenerate the mapping evidence first and check it against the committed
checksums:

```bash
node scripts/industries-mapping-dryrun.mjs "<catalog-full-2026-07-07.csv>"
```

Approved mappings — **only these six values exist on active products**:

| Tag | → industry metaobject | Active |
|---|---|---:|
| `industry:clinic` | `clinics-doctors-offices` | 6,390 |
| `industry:urgent-care` | `urgent-care` | 4,344 |
| `industry:home-care` | `home-health` | 3,091 |
| `industry:hrt-surgery` | `hrt-clinics` | 531 |
| `industry:pharmacy` | `pharmacies` | 282 |
| `industry:occ-charities` | **deliberately NOT an industry page** | 106 |

`occ-charities` is served by `/solutions/occ` as a category. Giving it an
industry metaobject creates a second competing OCC surface.

**Do not invent membership** for `ems`, `long-term-care`, `physical-therapy`,
`private-practice`, `dental`, `veterinary`, `community-health`. They have no
approved products. That is the exact failure mode this migration exists to
prevent.

**Overlap warning:** `industry:clinic` covers 87% of the active catalogue and
subsumes most of `urgent-care`. Publishing Clinics, Private Practice and
Community Health as separate indexable pages off overlapping membership produces
near-duplicate doorway pages. Keep one broad clinical page indexable until the
others have genuinely distinct assortment.

### A3. Data reconciliation

| # | Task | Detail |
|---|---|---|
| A3.1 | **Inventory tracking decision, then negatives — in that order** | **1 of 10,293 variants has tracking enabled.** **624 inventory levels are negative** (mostly −1 to −4, tail past −17). While tracking is off the negatives are latent; switch tracking on before reconciling and 624 variants become unbuyable that minute. Do **not** bulk-clamp to zero — that erases how far each item drifted, the only evidence distinguishing oversell from a bad import. Full audit: [`inventory-location-audit.md`](audits/2026-08-02-catalog-cro/inventory-location-audit.md). **Do not run another consolidation import.** |
| A3.2 | **RX tag vs metafield** — 40 active products | Metafield true on 501, tag on 461; the tag set is a strict subset. Code now unions both, but the *data* should still be reconciled. → `rx-indicator-discrepancies.csv` |
| A3.3 | **41 zero-price active variants** | Currently render "Contact for pricing" and are blocked from checkout. Confirm intended. → `zero-price-active-variants.csv` |
| A3.4 | **3,166 duplicate SKUs** | Spanning >1 product each. Never usable as an identity key. |
| A3.5 | **41 active products with no `custom.brand_name`** | Their Brand line is correctly hidden. Populate if a public brand exists. → `active-missing-public-brand.csv` |
| A3.6 | **Rotate the BunnyCDN storage AccessKey** | Every request currently returns 401. |
| A3.7 | Confirm the canonical **OCC collection** GID/count and the intended gifts/toys handle | A `gifts-toys` registry entry exists but matches no live collection. |

---

## 4. Work package B — codebase developers

| # | Task | Notes |
|---|---|---|
| B1 | **`next` 16.2.12 → 16.3.0 as its own PR** | Clears the 3 remaining high advisories (`next`, `postcss`, `sharp`) in one semver-**minor** bump. Deliberately not bundled here: a framework upgrade would make it impossible to tell a remediation regression from an upgrade regression. Rationale + exit conditions: [`dependency-risk-exceptions.md`](security/dependency-risk-exceptions.md). **Read `node_modules/next/dist/docs/` first** — per `AGENTS.md`, this Next's conventions differ from what tooling assumes. |
| B2 | **Re-run the full Playwright suite once A0.1 lands** | 12 tests currently fail purely because the QA store lacks `gloves`, `testing-screening`, industry collections and `nitrile-exam-gloves-powder-free`. No CSP, contrast or axe violations among them. |
| B3 | **Verify the no-document-reload guarantee on real data** | `e2e/no-reload.spec.ts` is written but has never run against a populated catalogue. This is a core CRO claim of the branch. |
| B4 | **Linux visual baselines** | `e2e/visual.spec.ts` snapshots are darwin-only, so CI runs with `--ignore-snapshots`. Generate linux baselines once, commit them, drop the flag. |
| B5 | **Decide `ems` → `ems-first-responders`** | Registry slug is `ems`. Renaming now creates a redirect for a page with no assortment — deferred until it has products. |
| B6 | **Dead code:** `partnerVendor` | Declared in `types/product.ts`, read in `ProductInfo.tsx`, **never assigned anywhere**. The "Partner" row never renders. Remove or wire it. |
| B7 | **Pre-existing `text-gray-400` placeholders** | Not flagged by the contrast audit (placeholder text is a separate WCAG consideration) but worth a deliberate decision. |

### Where to look in the code

| Concern | File |
|---|---|
| Public brand resolution | `lib/brand.ts` |
| Filter allowlist — facets **and** inputs | `lib/filter-registry.ts` |
| RX detection + gate policy | `lib/rx-gate.ts` |
| RX server-side recheck | `app/actions/rx.ts` → `prepareCheckout()` |
| Label contract (card/PDP/quick-add/cart) | `lib/labels/labels.ts`, `lib/labels/shopify-labels.ts` |
| Zero-price / purchasability | `lib/purchasability.ts` |
| Industry support predicates | `lib/industries.ts` |
| Catalog discovery UI | `components/category/*`, `components/filters/FilterRail.tsx` |
| Card + quick-add | `components/store/ShopifyProductCard.tsx`, `ShopifyQuickAddButton.tsx` |
| CSP / nonce | `proxy.ts`, `lib/csp-nonce.ts` |
| Semantic colour tokens | `app/globals.css` (`--color-ink-*`) |

---

## 5. Work package C — QA: edge cases and user flows

None of the below has been exercised against real catalogue data. Prioritised.

### C1. RX compliance — highest risk

Requires A0.2 + A0.3. Logic is proven by 57 passing assertions
([`rx-compliance-verification.md`](audits/2026-08-02-catalog-cro/rx-compliance-verification.md));
the **UX walkthrough is not**.

| # | Flow | Expected |
|---|---|---|
| 1 | Non-RX cart → checkout | Not blocked |
| 2 | Signed-out, **tag-only** RX product in cart | Blocked; Sign In / Create Account |
| 3 | Signed-out, **metafield-only** RX product | Blocked identically (this is the 40-product gap) |
| 4 | Signed in, no document | Blocked; Upload Prescription Document |
| 5 | Signed in, document on file | Proceeds per existing policy |
| 6 | Approved exemption (Dynarex) | Not blocked — exemption logic is byte-identical to base |
| 7 | Mixed RX + non-RX cart | Blocked |
| 8 | Cart **popup** and full **cart page** | Both block consistently |
| 9 | **Direct checkout URL** while blocked | `prepareCheckout()` must refuse server-side |
| 10 | Companion validation app | Behaviour unchanged |

**Do not describe the frontend gate as bypass-proof.** It is the storefront UX
gate. The bypass-resistant control is the companion Shopify validation app,
which is untouched by this work.

### C2. Catalog discovery (category · OCC · industry)

Run on all three surfaces — they share one system and must behave identically.

Filter selection · two rapid filters · sort · search · clear search ·
pagination · active-chip removal · clear all · Back · Forward · subcategory
navigation · category switching.

Prove for each: **no new browser document request**, header/hero/navigator/
toolbar stay mounted, current results stay visible during pending state, only
the results region is `aria-busy`, URL and selections stay in sync, search stays
scoped to the current category/industry.

### C3. Product card edge cases

Short and long titles · one and multiple labels · **missing public brand** ·
compare-at pricing · **RX products** · out-of-stock · **zero-price** · missing
image · long variant names. Cards in a row must stay visually balanced when some
have labels and others don't.

Quick-add specifically: 44×44, in the card footer and **not** overlaid on the
image, accessible name includes the product title, shows a pending state,
cannot add a zero-price/unavailable/invalid variant, never says "Added" when
Shopify did not add the requested merchandise.

### C4. Accessibility and responsive

Viewports 375×812 · 390×844 · 768×1024 · 1024×768 · 1280×800 · 1440×900 ·
1920×1080. The automated sweep passes 56/56 but covers only routes the QA store
can render — **the category and industry grids are not covered**.

Check: no horizontal overflow · visible focus · full keyboard operation · Escape
closes the drawer and returns focus to the trigger · reduced-motion respected ·
44px critical targets · sticky controls don't obscure products · an older
shopper can understand every primary control.

### C5. Google Ads landing-page readiness

Per industry page: H1 and opening copy match ad-group intent · products relevant
· primary action obvious · no login to browse · gclid/UTM preserved through
browsing · GA4 events fire once (no duplicates) for industry view, search,
filter, sort, category select, product click, quick add, add to cart, begin
checkout, contact CTA · organic and paid visitors get substantively the same
page.

---

## 6. Decisions needed — Bilal / client

| # | Decision | Context |
|---|---|---|
| D1 | **Inventory tracking** — on or off, store-wide | Everything in A3.1 is downstream of this. |
| D2 | **Veterinary** — create a real assortment, or retire the route | Zero products today. Currently noindexed but still resolving, because a hard 404 on a URL with unknown organic history is worse. If analytics confirm no organic value, switch to a 410 in one hop. **No human-medical products were assigned to fill it**, deliberately. |
| D3 | **Unconditional OCC free-shipping wording** | Needs evidence or removal. |
| D4 | **Broad-clinical overlap** | Which of Clinics / Private Practice / Community Health stays indexable. |
| D5 | **`next@16.3.0`** as its own PR | See B1. |
| D6 | Whether hidden header/account stat bars stay hidden | |
| D7 | RX compliance package sign-off | Legal/compliance, not engineering. |

---

## 7. Document index

| Document | What it is |
|---|---|
| [`FINAL-REPORT.md`](audits/2026-08-02-catalog-cro/FINAL-REPORT.md) | **Authoritative.** Supersedes every other report in that folder. SHAs, defects, gates, blockers, launch recommendation. |
| [`catalog-baseline.md`](audits/2026-08-02-catalog-cro/catalog-baseline.md) | July-7 catalogue analysis; all 12 known values reproduced exactly. |
| [`industry-matrix.md`](audits/2026-08-02-catalog-cro/industry-matrix.md) | All 12 requested industry pages classified against real data. |
| [`rx-compliance-verification.md`](audits/2026-08-02-catalog-cro/rx-compliance-verification.md) | Ten-point RX evidence record, checked against git history and source. |
| [`inventory-location-audit.md`](audits/2026-08-02-catalog-cro/inventory-location-audit.md) | Read-only production inventory/location audit + correction package. |
| [`industry-architecture.md`](industry-architecture.md) | Industry metaobject/metafield/collection spec. |
| [`fordeer-replacement.md`](fordeer-replacement.md) | Shopify-native label system; step-by-step Admin setup. |
| [`dependency-risk-exceptions.md`](security/dependency-risk-exceptions.md) | Accepted advisories with exposure arguments and exit conditions. |
| `text-contrast-audit.md` | Measured rendered-contrast audit, 1,094 nodes. |
| `remediation-report.md` | **Superseded.** Kept for the audit trail only. |

### Tooling (all read-only or dry-run)

| Script | Purpose |
|---|---|
| `scripts/qa-fixtures-export.mjs` | QA pre-write snapshot / rollback source. Dual-gated on shop identity. |
| `scripts/industries-mapping-dryrun.mjs` | Industry tag→metaobject mapping. No Shopify calls at all. |
| `scripts/labels-detect-definitions.mjs` | Read-only label definition detection. |
| `scripts/labels-assign-dryrun.mjs` | Label assignment planner; emits rollback before any write. |
| `scripts/audit-inventory-locations.mjs` | Inventory/location audit. `admin()` structurally refuses any `mutation`. |
| `scripts/audit-text-contrast.mjs` | Rendered contrast measurement. |
| `scripts/audit-with-exceptions.mjs` | `npm audit` against the reviewed exception list. |

Bulk evidence is gitignored and regenerable — git carries sha256 checksums
(`industry-evidence-checksums.txt`) and a rollback **schema**, not 81k rows of
payload. Regenerate and verify against the checksums before relying on it.

---

## 8. Rollback

`git checkout main`, or reset to `backup/pre-clean-fix-completion-2026-07-30`.
No migrations, no data backfills, no Shopify writes. New flags default safe.
`RX_CHECKOUT_ENFORCEMENT=false` is the RX emergency kill switch — **not** a
launch toggle.

## 9. Launch recommendation

**Not release-ready — and the blocker is evidence, not known defects.**

Nothing outstanding is a known defect. What is missing is that the three
highest-risk surfaces — category/industry grids, the no-reload guarantee, and
the RX account/document walkthrough — have never been exercised against a shop
with real data.

Fastest path: **A0.1** (two Actions secrets) → hosted E2E against real data →
**A0.2 + A0.3** (QA scopes + RX fixture) → C1 and C2 → re-assess.

Both unblockers are configuration, not code, and neither is a Shopify write.
