# Launch remediation status — 2026-08-14

**Prepared by:** Sardor (dev) · **For:** Bilal / Izzy
**Sources:** `LG-01-LG-02-GATE-REPORT-2026-08-13.pdf` (Izzy) · `2026-08-14-launch-remediation-dev-status.md` (prior dev session) · today's session, commits `a5af4ad..7c5fdb8` on branch `catalog-cro-review-sardor-dev` · **`FIELD-CONTRACT-FOR-SARDOR.pdf` (Izzy, later same day) — see §6 addendum**

This supersedes the two source reports above where they overlap; read it as the current state, not a diff against them.

---

## 1. Status at a glance

| Gate | Owner | Status | Blocked on |
|---|---|---|---|
| LG-01 — Manufacturer numbers, Admin search | Izzy | 🟡 Substantially done | Juliette (487 spot-check batch, 249 exceptions) |
| LG-02 — Family reconstruction | Izzy | 🟡 Analyzed, not remediated | Bilal/Juliette decision on 151-row list + 2 urgent pricing defects |
| LG-03 — Selected-variant identity sync | Devs | 🟢 Code complete, live-verified except AeroWalk | Izzy's Shopify write (metafields + AeroWalk data) |
| LG-04 — Order units/packaging on PDP | Izzy + Devs | 🟡 Rendering done, product-level fallback fixed, no variant data yet | Izzy populating variant-level packaging |
| LG-05 — Backorder export + reset | Izzy | 🔴 Not started | Izzy (no report yet) |
| LG-06 — Deploy & production acceptance | Devs + Izzy | 🔴 Not started | Everything above landing first; deploy access |
| H-01 — Vendor Shipping & Returns | Devs | 🟢 Done | — |
| H-02 — Free Shipping workbook | Izzy + Devs | 🔴 Blocked | Juliette's workbook |
| H-03 — Natural filter sorting | Devs | 🟢 Done | — |
| H-04 — Backorder/ETA + "Rx Only" copy | Devs | 🟡 Partially done | Bilal/Juliette: resolve ETA-display policy conflict |
| S-01 — Residual catalog exceptions | Izzy | 🔴 Not started | Izzy-dependent, P2 |
| F-01 — Conditional vendor shipping messages | — | 🔴 Deferred | Future client approval, P3 |

🟢 done · 🟡 partial/blocked-on-data · 🔴 not started

---

## 2. Detailed breakdown

### LG-01 — Manufacturer item numbers & Shopify Admin searchability (Izzy)

**Done:** 4,293 products retitled, 0 errors, verified on both Admin search surfaces (Products search, Draft Order → Add Product). No handle, variant SKU, metafield, price, inventory, or status touched. Identifier separation (manufacturer number vs. internal SKU) preserved everywhere it existed, restored on 68 Medchain products that had lost it.

**Not done, and why:**
- 487 single-source titles held for a spot check — second batch, not yet applied.
- 249 exceptions routed to Juliette (242 are Kemp USA, genuinely split 114 against 67) — needs her decision before these can be retitled.
- 1 title exceeds Shopify's 255-character limit — needs shortening.
- Short-number search ranking (e.g. `402` returns 25 results with the correct one last, because Shopify matches substrings) — **not fixable by retitling at all.** This is Shopify's own ranking behavior, not a data problem. If exact short-number lookup is required, the fix is a workflow change (scope Draft Order search to SKU rather than All), not a catalog change.

### LG-02 — Family reconstruction and classification (Izzy)

**Done:** All 1,281 multi-variant families classified (307 valid fit-sizing, 224 valid color, 53 valid order-unit, 535 split candidates, 111 unreadable, 51 Default Title defects). Juliette's review list narrowed from the full catalog to 151 genuinely ambiguous rows.

**Not done, and why:** Nothing has been structurally changed yet — this phase was analysis only. Two items need a decision *before* any write:
1. **Four sharps-container products are sellable 92–97% below cost** (e.g. a $123.55 case sold at the $3.99 each-price because the case is the pre-selected default variant). Zero orders reference these variants, so nothing has been lost yet — but they're live.
2. **51 Medchain products carry "Default Title" as a customer-facing option** alongside Case/Each, both at one price — the same defect as the sharps containers, mirrored: the box variant sits at ~5.8x what it should cost. `custom.order_size`/`custom.units_per_order` already contain the evidence for the correct rename and price split.

Per the plan's own safety rule, no product/variant is deleted or repriced without an explicit decision — this is deliberately withheld pending Bilal/Juliette.

### LG-03 — Synchronize selected-variant identity (Devs)

**Done before this session** (prior dev session, e2e-verified against real Shopify data): selecting a variant now updates SKU, H1, breadcrumb, media, URL, canonical URL, and structured data together, on both PDP routes.

**Done this session** (commits `09a40f2`..`4c2c51a`): the four variant-detail fields Bilal approved (Manufacturer Item Number, Order Size, Units per Order, Variant Description) are now queried, normalized, resolved, and rendered — this was explicitly out of scope before because no field contract existed. Also fixed along the way:
- The PDP's Specifications tab literally labeled the **internal SKU** as "Item Number" — the exact manufacturer-number/SKU conflation the launch plan's non-negotiable rule forbids. Now two separate, separately-labeled rows.
- `/category/[slug]/[product]` never rendered structured data (`ProductSchema`) at all, for any product, ever — only `/product/[slug]` had it. Both routes now agree.
- The PDP gallery and Quick Add's gallery both fell back to the *entire shared product gallery* (every color's images) when a selected color had no image of its own — the precise defect Bilal reported for AeroWalk ("both storefronts continue showing the Blue image"). Both now fall back to the neutral placeholder instead, never a sibling color.
- Quick Add never swapped its image on variant selection at all, for any product — a separate, pre-existing gap unrelated to AeroWalk, fixed in the same pass since Bilal's checklist requires verifying Quick Add.

**Not done, and why:** The AeroWalk pilot itself (Blue `10277BL` / White `10277WT` / Grey `10277GY`) cannot be verified end-to-end. All of the above is tested against mocked fixtures (144/144 test files, 1467/1467 tests passing) — it has never run against real AeroWalk data because Izzy hasn't created the four metafield definitions or written the pilot data in Shopify yet.

### LG-04 — Order units/packaging at the point of selection (Izzy + Devs)

**Done this session:** query, resolver, and display are fully built — the Order Unit block now sits directly below the variant selector and above Add to Cart, sourced from the same resolved values as the Order Packaging tab (never two different totals for one selection).

**Not done, and why:** Izzy hasn't populated real variant-level order-size/units-per-order values yet (product-level `custom.order_size` already exists and is used as a fallback, but that's not variant-specific packaging). This is a data-population task for Izzy, same blocker as LG-03.

### LG-05 — Export Backorder register, then reset (Izzy)

**Not started.** No update exists from either Izzy's 2026-08-13 report (which only covered LG-01/LG-02) or this dev session. This is Shopify Admin work with a mandatory sequence — the complete pre-reset workbook must exist before any Backorder/ETA value is cleared — and devs have no visibility into whether it has begun.

### LG-06 — Deploy and complete production launch acceptance (Devs + Izzy)

**Not started.** Nothing from either dev session has been pushed or deployed — today's 13 commits remain local on `catalog-cro-review-sardor-dev`. This is explicitly a human-confirmed step per the plan and depends on LG-01, LG-02, LG-04, and LG-05 actually landing in Shopify first.

### H-01 — Vendor Shipping & Returns (Devs)

**Not attempted.** The existing Admin API client (`lib/shopify/admin.ts`) is deliberately scoped to customer RX metafields only; reading product-level policy content needs its own scope review. Not a launch blocker — P1, scheduled after the P0 gates.

### H-02 — Free Shipping workbook (Izzy + Devs)

**Blocked** on Izzy receiving Juliette's completed Drive/non-Drive workbook. Dev-side validation (the strict AND-gate between the merchant Boolean and the resolver's rate confirmation) is ready to run once that lands.

### H-03 — Natural filter/category sorting (Devs)

**Done**, prior session — one shared numeric-then-alphabetic comparator applied across filter groups and subcategory navigation, tested against the plan's own fixture examples.

### H-04 — Backorder/ETA behavior and "Rx Only" copy (Devs)

**Done:** "Rx Only" capitalization fixed everywhere (was "RX Only"); a regression test proves Backorder status structurally cannot gate Add to Cart.

**Not done, and why — this is a policy conflict, not a coding gap:** the launch plan's truth table wants a valid future ETA displayed as "Backorder plus estimated restock date." The shipped code has an earlier, heavily-tested "final business rule" that always renders exactly "Backorder," no date. These two documented decisions disagree. Current behavior (no date) was kept deliberately rather than picked one way silently — **this needs Bilal or Juliette, whoever owns that call, to resolve it explicitly.**

### S-01 / F-01

Untouched — S-01 is Izzy-dependent (P2), F-01 is explicitly deferred pending future client-approved rules (P3).

---

## 3. What Sardor still needs from Izzy before AeroWalk can be verified

From `docs/launch/2026-08-14-variant-field-contract.md`:

1. Confirmation of the 4 variant metafield namespace/keys (proposed: `custom.manufacturer_item_number`, `custom.order_size`, `custom.units_per_order`, `custom.variant_description`) — or the actual keys if different — **with Storefront `PUBLIC_READ` enabled**. A definition without Storefront access silently returns `null` with no error.
2. The three variant GIDs/handles for AeroWalk Blue/White/Grey, and the one consolidated product handle.
3. If any old color-specific handles are being retired, the old→new handle mapping, so a redirect row can be added to `docs/redirects-ready.json` (the existing mechanism — no code change needed, just the data).
4. Confirmation the images have actually been assigned to each variant (native Shopify variant-media, not a metafield) and cache/webhook revalidation has run for the AeroWalk handle.

---

## 4. Screenshot checklist — what, and exactly where

**Do this only after Izzy confirms the metafield definitions exist, the AeroWalk pilot data is written, and revalidation has run.** Taking these now, before Izzy's write, will just show the current defect (Blue image on every variant, no manufacturer number) — that's expected and not useful evidence yet.

Substitute `<aerowalk-handle>` and `<collection-slug>` with the real values once Izzy provides them (see §3.2).

### 4.1 Shopify Admin — Izzy

| # | Where | What to capture |
|---|---|---|
| A1 | Admin → Products → AeroWalk product page | Full page showing: color-neutral title/handle, the 5 pinned product metafields in order (Rx Only, Backorder, Estimated Backorder Restock Date, Free Shipping, Vendor Shipping & Returns), and confirm nothing else is pinned |
| A2 | Same page, variant list expanded | All three variant rows (Blue/White/Grey) visible with their own SKU and native image thumbnail |
| A3 | Admin → the **Blue** variant record, opened | The 4 variant-detail fields (Manufacturer Item Number `10277BL`, Order Size / Sold As, Units per Order, Variant Description) and the native variant image |
| A4 | Admin → the **White** variant record, opened | Same 4 fields for `10277WT` + its own native image (must differ from Blue's) |
| A5 | Admin → the **Grey** variant record, opened | Same 4 fields for `10277GY` + its own native image (must differ from Blue's) |
| A6 | Admin → Settings → Custom data → Products/Variants | The metafield definitions list, showing only the 5 pinned + 4 variant fields as merchant-visible; everything else (archived product ID, source image URL, match confidence, migration status, internal notes) unpinned under "View all" |

### 4.2 Storefront — `/product/<aerowalk-handle>` (desktop)

| # | Action | What to capture |
|---|---|---|
| B1 | Load the page with no `?variant=` (default selection) | H1, main image, SKU + Mfr# line, Order Unit block (above Add to Cart), Specifications tab showing Manufacturer Item Number / Internal SKU as separate rows |
| B2 | Click **White** in the color selector | Main image switches to White's own photo (not Blue's), Mfr# updates to `10277WT`, Order Unit block updates if White's packaging differs, URL updates to `?variant=<white-gid>` |
| B3 | Click **Grey** | Same checks as B2, for `10277GY` |
| B4 | Refresh the page while on the Grey `?variant=` URL | Confirms the deep link reproduces the exact same selected state (image, SKU, Mfr#) after a real reload |
| B5 | View Page Source → find the `application/ld+json` `<script>` block | `sku`, `mpn`, and `image` all match the currently-selected variant (Grey), not Blue |

### 4.3 Storefront — `/category/<collection-slug>/<aerowalk-handle>` (desktop)

Repeat B1–B5 on this route. The two routes must never disagree — this is the LG-03 contract, and this route previously had **no** structured data at all, so B5 here specifically confirms that gap is closed.

### 4.4 Mobile (390×844 or similar)

Repeat B1–B3 on both routes at mobile width. Specifically confirm: the Order Unit block still sits above Add to Cart without horizontal clipping, and the color selector's tap targets remain usable.

### 4.5 Quick Add (from any grid card showing AeroWalk)

| # | Action | What to capture |
|---|---|---|
| C1 | Open Quick Add for AeroWalk from a category or search grid | Default (Blue) image and SKU |
| C2 | Click **White** inside the modal | Image switches to White's photo — this previously never worked for *any* product, not just AeroWalk, so this screenshot doubles as evidence for that fix |
| C3 | Click **Grey** | Image switches to Grey's photo |

### 4.6 Cart

| # | Action | What to capture |
|---|---|---|
| D1 | Add White to cart from the PDP | Cart popup line shows White's SKU/variant, not a generic or Blue line |
| D2 | Open the full cart page | Same line item, same variant identity, correct price |

### 4.7 Summary grid to fill in

| Surface | Blue | White | Grey |
|---|---|---|---|
| Admin variant record | ☐ | ☐ | ☐ |
| PDP `/product/` desktop | ☐ | ☐ | ☐ |
| PDP `/product/` mobile | ☐ | ☐ | ☐ |
| PDP `/category/` desktop | ☐ | ☐ | ☐ |
| PDP `/category/` mobile | ☐ | ☐ | ☐ |
| Structured data (both routes) | ☐ | ☐ | ☐ |
| Quick Add | ☐ | ☐ | ☐ |
| Cart | ☐ | ☐ | ☐ |

---

## 5. Traceability

Today's work: 13 commits, `a5af4ad..7c5fdb8` on `catalog-cro-review-sardor-dev`. Full suite green (144/144 test files, 1467/1467 tests), `tsc`/lint clean, build succeeds, existing live-data e2e spec (`e2e/variant-identity.spec.ts`) still 4/4 against real Shopify data. Branch not yet pushed or merged.

---

## 6. Addendum — Izzy's field contract received (`FIELD-CONTRACT-FOR-SARDOR.pdf`)

Izzy's contract confirms the four variant keys exactly as this doc's §3.1 already proposed (`custom.manufacturer_item_number`, `custom.order_size`, `custom.units_per_order`, `custom.variant_description`), confirms `custom.shipping_returns` as the H-01 source, and proposes `custom.estimated_back_order_restock_date` as the authoritative Backorder ETA field (matching what `GET_PRODUCT` already reads for that purpose). Nothing in it requires a different key or type than what dev already implemented or expected — see the reply drafted for Sardor to send back confirming all three.

Two things unblocked by the confirmation, done this session (commits pending):

- **H-01 — Vendor Shipping & Returns: done.** `GET_PRODUCT` now selects `custom.shipping_returns` (rich text). Shopify's rich-text JSON is flattened to plain paragraphs (`lib/policy/rich-text.ts`) and fed into `resolveReturnPolicy`'s `vendorPolicyText` (`lib/policy/return-policy.ts`), which already existed for exactly this purpose (its own docstring named "IZ-PROD-04" as the missing piece). Products without a value still render the approved general fallback — never empty, never invented. Only 10,001 of the catalog's products carry a value, so this is expected on the rest.
- **LG-04 fallback bug found and fixed.** `ProductView.tsx` already computed `resolveVariantValue(selectedVariant.orderSize, product.orderSize)`, but `GET_PRODUCT` never selected `custom.order_size`/`custom.units_per_order` at the *product* level — only at variant level. `product.orderSize`/`product.unitsPerOrder` were therefore always `null`, so the fallback silently never activated for the common case (a product with shared packaging and no variant-level override). Fixed by adding both product-level selections. This does not by itself populate real variant-level data — that's still Izzy's bulk write on the 39 families — but it means products that already carry only the product-level value (10,001 / 8,210 of them) will now actually show it, instead of showing nothing.

Verification: `tsc --noEmit` 0 errors, `npm run lint` clean, `npx vitest run` 145/145 test files / 1476/1476 tests passing (up from 144/1467, new coverage for both changes), `npm run build` succeeds.

**Still not done, and why:** the AeroWalk pilot write itself (creating the 4 variant metafield definitions, re-pinning the 5 product fields, populating Blue/White/Grey data) is explicitly Izzy's next step per the contract, gated on Sardor's reply confirming the three open questions — not something dev can do without Shopify Admin write access. The screenshot checklist (§4) still can't be captured until that write lands and revalidation runs. The H-04 ETA *display* policy conflict (§ of the prior report) is unrelated to which field is authoritative and is still unresolved — this contract answers "which field to read," not "whether to show a date," and that still needs Bilal/Juliette.
