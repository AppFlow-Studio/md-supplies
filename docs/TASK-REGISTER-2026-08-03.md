# Master task register — everything outstanding

Consolidated from every audit, handoff and report in this repo plus the
2026-08-03 verification pass. This is the **assignment list**. For *why* things
are the way they are, read
[`HANDOFF-catalog-cro-2026-08-03.md`](HANDOFF-catalog-cro-2026-08-03.md); for
*evidence*, read
[`FINAL-REPORT.md`](audits/2026-08-02-catalog-cro/FINAL-REPORT.md).

Branch `fix/catalog-cro-remediation-2026-08-02` @ `7da83b8` · Draft
[PR #1](https://github.com/BilalA99/md-supplies/pull/1) · nothing merged · **no
Shopify writes performed.**

## Legend

| | |
|---|---|
| **P0** | Blocks launch |
| **P1** | Blocks confidence — launch is a gamble without it |
| **P2** | Should be done, not launch-blocking |
| 🔴 | Blocked on someone else |
| 🟡 | Ready to start |
| 🔵 | Decision, not engineering work |

Owners: **IZ** Izzy (Shopify Admin) · **DEV** codebase · **QA** testing ·
**BIL** Bilal/product · **CLI** client/compliance.

---

## A. Unblockers — do these before assigning anything else

Everything in §D and half of §C is gated behind these three. They are
configuration, not code, and none is a Shopify write.

| ID | P | Owner | Task | Acceptance |
|---|---|---|---|---|
| **A-01** | P0 🟡 | BIL/IZ | Add `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_ACCESS_TOKEN` to **Actions secrets** on the repo CI runs against (Settings → Secrets and variables → Actions) | `lint · types · tests · build` goes green and `e2e (Playwright)` actually runs. Currently the fork has **zero** secrets configured, so Build fails its own precondition and E2E is skipped. |
| **A-02** | P0 🟡 | IZ | Grant the QA custom app: `read_products`, `write_products`, `read_inventory`, `write_inventory`, `read_locations`, `read_publications`, `write_publications` (+ `read/write_metaobjects` for metaobject fixtures) | `node scripts/qa-fixtures-export.mjs` completes and writes `qa-prestate.json`. Today the token grants **only** `shop` + `metafieldDefinitions`; everything else is `ACCESS_DENIED` and the `atkn_` token returns 401. |
| **A-03** | P0 🔴(A-02) | IZ | Add RX fixtures to the QA store: **one tag-only** (`compliance:rx-only`), **one metafield-only** (`custom.is_rx_only = true`), **one non-RX control** | The QA store contains no RX-flagged product at all, so the gate cannot be exercised end-to-end even with scopes. Take the pre-write snapshot first. |

> **Sequence:** A-01 first — it's the cheapest and unblocks the most. It may
> resolve several §D items on its own by running E2E against real catalogue data.

---

## B. Shopify Admin — Izzy

Ordered. Each is independently reversible. **Do not batch into one operation.**
Items carried forward from `audit/izzy-production-handoff-2026-07-30.md` keep
their original IZ-xx number so old tickets still resolve.

### B1. Product labels — replaces Fordeer

Spec with exact fields: [`fordeer-replacement.md`](fordeer-replacement.md).
**The code is already in place and inert** — it activates when the definitions
exist. No deploy, no code change.

| ID | P | Task | Acceptance |
|---|---|---|---|
| **B-01** | P1 🟡 | Create the `product_label` **metaobject** definition | Fields exactly per spec; type is `product_label` |
| **B-02** | P1 🔴(B-01) | Create the `custom.product_labels` **product metafield** (`list.metaobject_reference` → `product_label`) | |
| **B-03** | P0 🔴(B-02) | **Enable Storefront access on both** | Without it the storefront reads nothing and fails closed — labels silently never appear |
| **B-04** | P1 🔴(B-03) | Verify with `node scripts/labels-detect-definitions.mjs` (read-only) | Script reports both definitions found |
| **B-05** | P2 🔴(B-04) | Assign labels via `node scripts/labels-assign-dryrun.mjs <csv>` — **dry run first** | Rollback file emitted before any write; identity is product GID, never SKU |
| **IZ-03** | P2 🔵 | Decide whether the **Fordeer subscription** is still needed | Only required if you still want labels on the Online Store theme. It cannot feed the headless site — it renders via a theme app embed, which Next.js never loads. |

### B2. Industries — metaobject architecture

Spec: [`industry-architecture.md`](industry-architecture.md) · data:
[`industry-matrix.md`](audits/2026-08-02-catalog-cro/industry-matrix.md).

| ID | P | Task | Acceptance |
|---|---|---|---|
| **B-06** | P1 🟡 | Create `faq_entry` + `industry` metaobject definitions | Per spec, Storefront access enabled |
| **B-07** | P1 🔴(B-06) | Create the `custom.industries` product metafield | `list.metaobject_reference` → `industry` |
| **B-08** | P1 🔴(B-07) | Create **one automated collection per approved industry**, condition `custom.industries` contains *(metaobject)* | Handle matches the industry slug |
| **B-09** | P1 🔴(B-08) | Apply assignments from `industries-mapping-dryrun.mjs` output | Regenerate first, verify sha256 against `industry-evidence-checksums.txt` |

**The only six `industry:` values on active products — do not invent others:**

| Tag | → metaobject | Active |
|---|---|---:|
| `industry:clinic` | `clinics-doctors-offices` | 6,390 |
| `industry:urgent-care` | `urgent-care` | 4,344 |
| `industry:home-care` | `home-health` | 3,091 |
| `industry:hrt-surgery` | `hrt-clinics` | 531 |
| `industry:pharmacy` | `pharmacies` | 282 |
| `industry:occ-charities` | **deliberately none** — served by `/solutions/occ` | 106 |

**No products exist** for `ems`, `long-term-care`, `physical-therapy`,
`private-practice`, `dental`, `veterinary`, `community-health`. Assigning
products to fill these pages is the exact failure this migration prevents.

> ⚠️ **Overlap:** `industry:clinic` covers 87% of the active catalogue and
> subsumes most of `urgent-care`. Publishing Clinics, Private Practice and
> Community Health as separate indexable pages off overlapping membership
> produces near-duplicate doorway pages. See **E-04**.

### B3. Inventory — sequencing matters more than any single fix

Full audit:
[`inventory-location-audit.md`](audits/2026-08-02-catalog-cro/inventory-location-audit.md).

| ID | P | Task | Acceptance |
|---|---|---|---|
| **B-10** | P0 🔵 | **Decide inventory tracking**, store-wide (see **E-01**) | Everything below is downstream of this |
| **B-11** | P0 🔴(B-10) | Reconcile **624 negative inventory levels** to counted quantities | **Do not bulk-clamp to zero** — that erases how far each item drifted, the only evidence distinguishing oversell from a bad import |
| **B-12** | P0 🔴(B-11) | Only then consider enabling tracking | Tracking is on for **1 of 10,293** variants. Enable before reconciling and **624 variants become unbuyable that minute** |
| **B-13** | P2 🟡 | Do **not** run another consolidation import | The −1 to −4 distribution with a tail past −17 reads as import residue |

### B4. Data reconciliation

| ID | P | Task | Source |
|---|---|---|---|
| **B-14** | P1 🟡 | Reconcile **RX tag vs `custom.is_rx_only`** — 40 active products have the metafield but no tag | `rx-indicator-discrepancies.csv` |
| **IZ-04** | P1 🟡 | Retire one of the two RX tags (`rx-required` display vs `compliance:rx-only` gate); confirm the canonical backorder metafield + expiry rule | Both currently in the catalogue |
| **B-15** | P1 🟡 | Confirm the **41 zero-price active variants** are intentional | They render "Contact for pricing" and are blocked from checkout. `zero-price-active-variants.csv` |
| **B-16** | P2 🟡 | Review **3,166 duplicate SKUs** spanning >1 product | Never usable as an identity key |
| **B-17** | P2 🟡 | Populate `custom.brand_name` for the **41 active products** missing it | Brand line is correctly hidden meanwhile. `active-missing-public-brand.csv` |
| **B-18** | P0 🟡 | **Rotate the BunnyCDN storage AccessKey** | Every request currently returns **401** |
| **IZ-01** | P1 🟡 | Confirm the canonical **OCC collection** — record GID + exact product count | Handle `occ` exists live; `OCC_COLLECTION_HANDLE` can override per env |
| **IZ-02** | P2 🟡 | Supply the correct **gifts/toys** handle or confirm retirement | `gifts-toys` does not exist; the 404ing link was removed |
| **IZ-05** | P2 🟡 | Populate the per-vendor **return policy** source; give us the metafield ns/key | `resolveReturnPolicy()` already accepts approved vendor text; general fallback renders meanwhile |
| **IZ-06** | P1 🟡 | Create the **partial-shipment fixture** — one line qty 10, fulfil 4 then 3, each with tracking | Verifies account order display: two shipment cards, Pending shows 3, refunds never shown as pending |
| **IZ-08** | P1 🟡 | Verify the documented **Dukal $30 threshold** and representative checkout behaviour | `SHIPPING_RESOLVER_ENABLED` stays **off** until wording, data and QA are approved. Do not create freight/Canada rules |

---

## C. Codebase — developers

| ID | P | Owner | Task | Notes |
|---|---|---|---|---|
| **C-01** | P0 🔴(A-01) | DEV | Re-run the full Playwright suite once secrets land | 12 tests currently fail **only** because the QA store lacks `gloves`, `testing-screening`, industry collections and `nitrile-exam-gloves-powder-free`. No CSP, contrast or axe violations among them. |
| **C-02** | P0 🔴(C-01) | DEV | **Verify the no-document-reload guarantee on real data** | `e2e/no-reload.spec.ts` exists but has never run against a populated catalogue. This is a core CRO claim of the branch. |
| **C-03** | P1 🟡 | DEV | **`next` 16.2.12 → 16.3.0 as its own PR** | Clears the 3 remaining high advisories (`next`, `postcss`, `sharp`) in one semver-**minor** bump. Not bundled here so a reviewer can tell a remediation regression from an upgrade regression. **Read `node_modules/next/dist/docs/` first** — per `AGENTS.md` this Next's conventions differ from what tooling assumes. Rationale: [`dependency-risk-exceptions.md`](security/dependency-risk-exceptions.md) |
| **C-04** | P1 🟡 | DEV | **Fix the stale `env-feature-flag-register.md`** | It documents `RX_CHECKOUT_ENFORCEMENT` as **default-disabled, enabled when `"true"`**. The code is now `!== 'false'` — i.e. **default ENABLED**. A compliance reader following that doc would conclude the RX gate is off when it is on. Same staleness in IZ-09. **Safety-relevant doc bug — fix before anyone makes a compliance decision from it.** |
| **C-05** | P2 🟡 | DEV | Generate **linux visual baselines** for `e2e/visual.spec.ts` | Snapshots are darwin-only, so CI runs `--ignore-snapshots`. Run once with `--update-snapshots` on the runner, commit, drop the flag. |
| **C-06** | P2 🔵 | DEV/BIL | Decide `ems` → `ems-first-responders` slug rename | Registry slug is `ems`. Renaming now creates a redirect for a page with no assortment — deferred until it has products. |
| **C-07** | P2 🟡 | DEV | Remove or wire **`partnerVendor`** | Declared in `types/product.ts`, read in `ProductInfo.tsx`, **never assigned anywhere**. The "Partner" row can never render. Dead code. |
| **C-08** | P2 🟡 | DEV | Decide on `text-gray-400` **placeholder** text | Not flagged by the contrast audit (placeholders are a separate WCAG consideration) but worth a deliberate call. |
| **C-09** | P1 🔴(B-03) | DEV | Wire and verify the **label metaobject** read path end to end | Code is inert until definitions exist. Confirm the fragment matches the live schema — it was written against the documented schema and is **unverified**. |
| **C-10** | P1 🔴(B-08) | DEV | Point industry pages at the **metaobject + automated collection** behind a flag, default off | Retire `industry:*` tag reads only after production verification |
| **C-11** | P2 🟡 | DEV | Confirm `OCC_COLLECTION_HANDLES` matches IZ-01's answer | `app/solutions/occ/page.tsx` tries `occ` / `operation-christmas-child` / `occ-supplies` then a `tag:occ` fallback. `lib/occ.ts`'s static `eligibleProducts` is now **unused sample data** — remove it. (`data-gap-log.md`) |

### Concern → file map

| Concern | File |
|---|---|
| Public brand resolution | `lib/brand.ts` |
| Filter allowlist — facets **and** inputs | `lib/filter-registry.ts` |
| RX detection + gate policy | `lib/rx-gate.ts` |
| RX server-side recheck | `app/actions/rx.ts` → `prepareCheckout()` |
| Label contract | `lib/labels/labels.ts`, `lib/labels/shopify-labels.ts` |
| Zero-price / purchasability | `lib/purchasability.ts` |
| Industry support predicates | `lib/industries.ts` |
| Catalog discovery UI | `components/category/*`, `components/filters/FilterRail.tsx` |
| Card + quick-add | `components/store/ShopifyProductCard.tsx`, `ShopifyQuickAddButton.tsx` |
| CSP / nonce | `proxy.ts`, `lib/csp-nonce.ts` |
| Semantic colour tokens | `app/globals.css` (`--color-ink-*`) |
| Claims register | `lib/claims.ts` |

---

## D. QA — edge cases and user flows

**None of this has been exercised against real catalogue data.** Prioritised.

### D1. RX compliance — highest risk 🔴(A-02, A-03)

Logic is proven by 57 passing assertions
([`rx-compliance-verification.md`](audits/2026-08-02-catalog-cro/rx-compliance-verification.md)).
The **UX walkthrough is not**.

| ID | Flow | Expected |
|---|---|---|
| **D-01** | Non-RX cart → checkout | Not blocked |
| **D-02** | Signed-out, **tag-only** RX in cart | Blocked; Sign In / Create Account |
| **D-03** | Signed-out, **metafield-only** RX | Blocked identically — this is the 40-product gap |
| **D-04** | Signed in, no document | Blocked; Upload Prescription Document |
| **D-05** | Signed in, document on file | Proceeds per existing policy |
| **D-06** | Approved exemption (Dynarex) | Not blocked — exemption logic is byte-identical to base |
| **D-07** | Mixed RX + non-RX cart | Blocked |
| **D-08** | Cart **popup** and full **cart page** | Both block consistently |
| **D-09** | **Direct checkout URL** while blocked | `prepareCheckout()` refuses server-side |
| **D-10** | Companion validation app | Behaviour unchanged |
| **D-11** | Upload rejects oversized / wrong-type / unscanned files | `RX_SCAN_REQUIRED` fail-closed |

> ⚠️ **Never describe the frontend gate as bypass-proof.** It is the storefront
> UX gate. The bypass-resistant control is the companion Shopify validation app.

### D2. Catalog discovery 🔴(A-01)

Run identically on **category, OCC and industry** — one shared system.

| ID | Coverage |
|---|---|
| **D-12** | Filter selection · two rapid filters · sort · search · clear search · pagination · chip removal · clear all · Back · Forward · subcategory nav · category switching |
| **D-13** | Prove **no new browser document request** after initial load on every one of the above |
| **D-14** | Header, hero, subcategory navigator and toolbar stay **mounted**; current results stay visible during pending; only the results region is `aria-busy` |
| **D-15** | URL ⇄ selections stay in sync across Back/Forward |
| **D-16** | Search stays **scoped** to the current category/industry |
| **D-17** | Empty-state and loading-state accuracy; visible route back to the unfiltered page |

### D3. Product card edge cases 🔴(A-01)

| ID | Coverage |
|---|---|
| **D-18** | Short and long titles · one and multiple labels · **missing public brand** · compare-at pricing · **RX** · out-of-stock · **zero-price** · missing image · long variant names |
| **D-19** | Cards in a row stay visually balanced when some have labels/compare-at and others don't |
| **D-20** | Quick-add: 44×44 · in the card **footer**, not on the image · accessible name includes the product title · pending state · cannot add zero-price/unavailable/invalid · never says "Added" when Shopify did not add it |

### D4. Accessibility and responsive

Automated sweep passes **56/56** but only covers routes the QA store can render
— **category and industry grids are not covered**.

| ID | Coverage |
|---|---|
| **D-21** | 375×812 · 390×844 · 768×1024 · 1024×768 · 1280×800 · 1440×900 · 1920×1080 |
| **D-22** | No horizontal overflow · visible focus · full keyboard operation · Escape closes the drawer and **returns focus to the trigger** · reduced-motion respected |
| **D-23** | 44px critical targets · sticky controls don't obscure products |
| **D-24** | **An older shopper can understand every primary control** — the stated audience |
| **D-25** | Screen-reader pass on cart, account, RX gate and the filter drawer |

### D5. Google Ads landing-page readiness 🔴(B-08)

| ID | Coverage |
|---|---|
| **D-26** | H1 + opening copy match ad-group intent; products relevant; primary action obvious; no login to browse |
| **D-27** | **gclid / UTM preserved** through filtering, sorting, search and pagination |
| **D-28** | GA4 fires **once** (no duplicates) for: industry view · search · filter · sort · category select · product click · quick add · add to cart · begin checkout · contact CTA |
| **D-29** | Organic and paid visitors get substantively the same page |
| **D-30** | Any promotion named in an ad is visibly and accurately reflected on the page |

### D6. Commerce flows

| ID | Coverage |
|---|---|
| **D-31** | Add to cart → cart → checkout handoff, signed-in and guest |
| **D-32** | Account: order history, **partial shipments** (needs IZ-06), addresses |
| **D-33** | Contact + sourcing forms — delivery to the approved recipient only, abuse protection |
| **D-34** | Redirect map end-to-end (`docs/redirect-qa.md`) — old Magento/Woo URLs land in **one hop** |
| **D-35** | 404 / 410 / error-boundary pages render correctly and are noindexed |

---

## E. Decisions — Bilal / client

| ID | P | Owner | Decision | Why it's blocking |
|---|---|---|---|---|
| **E-01** | P0 | CLI | **Inventory tracking on or off**, store-wide | All of B3 is downstream. Wrong order makes 624 variants unbuyable. |
| **E-02** | P0 | CLI | **RX compliance package** — affected products/states, acceptable documents, verification owner, expiry, guest flow, storage/retention/deletion, exact checkout rule (IZ-09) | The gate is now **ON by default**; the policy behind it must be written down. |
| **E-03** | P1 | CLI | **Veterinary** — create a real assortment, or retire the route | Zero products. Currently noindexed but still resolving. If analytics show no organic value, switch to 410 in one hop. **No human-medical products were assigned to fill it**, deliberately. |
| **E-04** | P1 | CLI | **Broad-clinical overlap** — which of Clinics / Private Practice / Community Health stays indexable | Publishing all three off overlapping membership creates doorway pages. |
| **E-05** | P1 | CLI | **Unconditional OCC free-shipping wording** | Needs evidence or removal. |
| **E-06** | P1 | CLI | **Claims evidence** (IZ-07) — "12,000+ Facilities", "99.8% Order Accuracy", "Fast Shipping", "8,000+ Products" | All currently render **nothing** pending approval. Needs a dated census + exact wording + evidence date. 7,384 / 8,000+ / 12,000+ are **not** interchangeable. |
| **E-07** | P2 | BIL | `next@16.3.0` as its own PR | See C-03 |
| **E-08** | P2 | BIL | Whether hidden header/account stat bars stay hidden | |
| **E-09** | P2 | BIL | Whether to open a draft PR against **`AppFlow-Studio/md-supplies`** | Currently PR #1 targets the fork's own `main`, so it is invisible in the team's normal workflow — and the org repo likely already has the CI secrets from A-01. |

---

## F. Documentation debt

| ID | P | Owner | Task |
|---|---|---|---|
| **F-01** | **P0** | DEV | Fix `env-feature-flag-register.md` — `RX_CHECKOUT_ENFORCEMENT` is documented as default-**disabled**; it is now default-**enabled**. Safety-relevant. (= C-04) |
| **F-02** | P1 | DEV | Update IZ-09's "enforcement is disabled by default" statement for the same reason |
| **F-03** | P2 | DEV | Fold `audit/izzy-production-handoff-2026-07-30.md` into this register, or mark it superseded — IZ items are duplicated across both today |
| **F-04** | P2 | DEV | `remediation-report.md` is superseded; keep for the audit trail but mark it clearly at the top |
| **F-05** | P2 | DEV | `data-gap-log.md` still lists the 2026-06-11 OCC row as unresolved — close it once IZ-01 lands |

---

## G. Guardrails that must survive all of the above

Each is a defect this branch fixed and that a well-meaning refactor would
silently reintroduce.

1. **Never render Shopify `vendor` as a customer-facing Brand.** Use
   `publicBrand()`. No approved brand ⇒ render nothing, never fall back.
2. **Never re-add `productVendor` to the filter INPUT allowlist.** Denying the
   *facet* is only half the gate — that was the leak.
3. **Never narrow RX detection**, and never re-implement it inline. The union
   may widen, never narrow.
4. **A promotional label can never create a shipping or RX promise.** "Free
   Shipping" only from the shipping resolver; "Rx Only" only from RX policy.
5. **Never publish an indexable industry page with zero products.**
6. **Never `unsafe-inline` / `unsafe-eval` / drop `strict-dynamic`** to fix a
   CSP error — `e2e/csp.spec.ts` will fail you.
7. **SKU is never an identity** — 3,166 SKUs span more than one product.
8. **No production Shopify writes** without separate explicit approval.

---

## H. Suggested sequencing

**Week 1 — unblock and see the truth**
A-01 → C-01 → C-02. Then A-02 → A-03 → D1 (RX). In parallel: C-04/F-01 (stale
safety doc), B-18 (rotate the CDN key), E-01 + E-02 kicked off with the client.

**Week 2 — Shopify data model**
B-01…B-05 (labels) and B-06…B-09 (industries) in parallel, each dry-run first.
C-09/C-10 wire them behind flags. B-10…B-13 (inventory) once E-01 lands.

**Week 3 — verification**
D2, D3, D4 against real data. IZ-06 fixture → D-32. IZ-08 → shipping. D5 once
industry collections exist.

**Week 4 — decisions and cleanup**
E-03…E-06 resolved. C-03 (`next@16.3.0`) as its own PR. C-05, C-07, C-11, F-03…F-05.

**Launch gate:** every P0 closed, D1 and D2 passing against real data, hosted CI
green, and the RX compliance package (E-02) signed off in writing.
