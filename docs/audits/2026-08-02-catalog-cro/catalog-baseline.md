# Catalog Baseline — 2026-08-02

Source: `catalog-full-2026-07-07.csv` (31.2 MB, 45 columns, July 7 historical
export). **Not current live truth** — the storefront reads Shopify directly and
nothing in this analysis is implemented as an app data source. This document is
evidence only.

Independently recomputed with a fresh parser (`csv.DictReader`, product-level
dedupe on `product_id`), not copied from prior reports.

## Known values — all 12 reproduced exactly

| Metric | Expected | Recomputed | Result |
|---|---|---|---|
| Variant rows | 13,281 | 13,281 | ✅ |
| Products | 10,326 | 10,326 | ✅ |
| Active products | 7,384 | 7,384 | ✅ |
| Active variants | 10,292 | 10,292 | ✅ |
| Glove products | 445 | 445 | ✅ |
| Testing products | 173 | 173 | ✅ |
| Active brand ≠ vendor | 3,790 | 3,790 | ✅ |
| Active missing public brand | 41 | 41 | ✅ |
| Active zero-price variants | 41 | 41 | ✅ |
| Customer-filter category values | 870 | 870 | ✅ |
| Product Type values | 1,393 | 1,393 | ✅ |

Status split (product level): **active 7,384 · archived 2,923 · draft 19**
(= 10,326). Every `variant_id` is unique, so variant rows are not duplicated.

## Findings beyond the known list

### 1. RX indicator mismatch — 40 active products (safety)

| Signal | Products |
|---|---|
| `mf_is_rx_only = true` | 501 |
| RX tag (`compliance:rx-only` / `rx-required`) | 461 |
| Both | 461 |
| **Metafield true, no tag** | **40 (all ACTIVE)** |
| Tag but no metafield | 0 |

The tag set is a strict subset of the metafield set. The app's RX detection
(`lib/rx-gate.ts`) keyed **only** on the tag, so those 40 were invisible to it.
They are unambiguous prescription items — e.g. Xylocaine 1% w/ Epinephrine,
Bupivacaine 0.5% injection, Hospira Bacteriostatic Water ("*Physician's License
Required*" in the title).

No live customer impact today, because RX checkout enforcement ships disabled
(`RX_CHECKOUT_ENFORCEMENT`). But the detection gap would have become real the
moment enforcement was approved.

**Action taken (code, fail-safe direction only):** detection now also honours
the store's own `is_rx_only` metafield, so the RX set can only widen, never
narrow. This consumes an existing Shopify declaration; it does **not** decide RX
policy. → `docs/audits/2026-08-02-catalog-cro/rx-indicator-discrepancies.csv`
**Izzy must confirm the canonical source and reconcile tag vs metafield.**

### 2. Duplicate SKUs — 3,166 values across 6,587 rows

Every duplicate spans **more than one product** (0 are within-product variant
repeats). SKU is therefore not a unique key and must never be used as
integration identity — consistent with the plan's GID rule. Not a UI defect;
flagged for Izzy's data review.

### 3. Zero-price variants — 41 active (55 total)

Sample titles include "…Order For Pricing", so at least some are deliberate
quote-only items. They are still purchasable-looking in a naïve UI.
→ addressed in Phase 11; list in `zero-price-active-variants.csv`.

### 4. `mf_free_shipping` populated on 217 products

This is the field the plan explicitly forbids using for public classification
("Ignore `custom.free_shipping` for public classification"). Verified the
storefront does **not** read it — the shipping resolver uses
`public_display_class` only.

### 5. Subcategory density — the root of the L2 navigation problem

Distinct **active** subcategories per L1: exam-room 97, home-care 72, hygiene 56,
needles-syringes 51, wound-care 50, **testing 47**, mobility 43,
patient-therapy-rehab 42. 794 distinct subcategory tags overall.

A flex-wrap row of 52px buttons cannot present 47–97 links — this quantifies why
products are pushed below the fold and drives the Phase 7 navigator design.
→ `subcategory-density.csv`

### 6. Other data quality

- 298 active variants missing `cost_per_item` (385 overall) — margin reporting only.
- 17 variants missing `locations`; 0 missing `delivery_profile`.
- 3 variants missing SKU entirely.
- 0 products missing `product_type`.
- 138 products carry a backorder ETA.
- 1 active product lacks `mf_customer_filter_category` (7,383 of 7,384).

## What this CSV cannot prove

**There are no image columns** (`has_image_columns` = empty). Any claim about
image coverage, broken CDN objects, or hero artwork is out of scope for this
file and was verified separately against the running app in Phase 4.

It is also a July 7 snapshot: counts will have drifted. Treat every number here
as a baseline to compare against, not as current live truth.
