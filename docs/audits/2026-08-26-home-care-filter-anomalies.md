# Home Care filter anomalies — Shopify data hand-off for Izzy

**Date measured:** 2026-08-26
**Store:** production Storefront API (`daebb2-76.myshopify.com`), API version 2026-04
**Method:** read-only. Every figure below came from `Query.search` / `Collection.products`
facet responses and per-value `totalCount` queries. **No Shopify data was written, and none
should be until this document is reviewed.**
**Raised by:** the Home Care / Bedside Commodes filter defect (duplicate "Shower Commode"
options with counts that did not match what clicking them returned).

---

## Summary

Three separate things were wrong. Two of them were storefront bugs and are fixed in code on
`nav-filter-ui-polish`. The third is **catalogue data, and needs a Shopify-side decision** —
that is what this document is for.

| # | Finding | Owner | Status |
|---|---|---|---|
| 1 | `Query.search` drops its `query` scope when `productFilters` is both passed and selected, so any filter on a tag-sourced route returned whole-catalogue results | Frontend | Fixed (`lib/shopify/queries/products.ts`) |
| 2 | `Query.search` facet counts are window-derived approximations, not match counts | Frontend | Fixed (`lib/catalog/exact-facet-counts.ts`) |
| 3 | **18 groups of duplicate `custom.*` metafield values in production** | **Izzy / catalogue** | **Open — see below** |

Finding 3 is normalised in the storefront for presentation only
(`lib/catalog/facet-canonicalization.ts`): one customer-facing option renders per concept, and
selecting it queries **every** raw spelling, so no product is hidden. The raw values in Shopify
are untouched. That is a display fix over a data problem, and the data problem should still be
closed at source.

---

## What the client actually saw, measured

`/category/home-care/shower-commodes` — 10 products in scope.

| Filter option shown | Count shown | Products returned on click | Correct |
|---|---|---|---|
| `Shower Commode` | 2 | 5 (8 before finding 1 was fixed) | ✗ |
| `Shower Commodes` | 2 | 4 | ✗ |

`/category/home-care/bedside-commodes` — 32 products in scope.

| Filter option shown | Count shown | Products returned on click | Correct |
|---|---|---|---|
| `Bedside Commodes` | 24 (17 at a different page size) | 32 | ✗ |
| `Shower Commode` | 1 | 8, including products in Mobility | ✗ |

After the fix, on the same routes:

| Route | Options in the Category facet | Count shown | Products returned |
|---|---|---|---|
| Home Care → Shower Commodes | `Shower Commodes` (merged) | 9 | 9 ✓ |
| Home Care → Bedside Commodes | `Bedside Commodes` | 32 | 32 ✓ |
| Home Care → Bedside Commodes | `Shower Commodes` (merged) | 1 | 1 ✓ |

---

## Finding 3 — duplicate values needing a Shopify decision

Full production scan of all 26 collection-backed category routes plus the three tag-sourced
routes (Room Furniture, Apparel, Face Masks). Every group below is **one concept spelled two
ways** — 16 are singular/plural pairs of an otherwise identical string, 2 are casing-only.

**Recommended action for each:** pick one spelling, and re-point the products carrying the
other at it. The storefront's canonical spelling (the one it shows and puts in the URL today)
is listed as *Storefront shows* — matching Shopify to it means no link or bookmark changes
behaviour.

Two rows need a judgement call rather than a mechanical merge, flagged inline:

* **`custom.brand_name` — `dynaCare` / `DynaCare`.** Which is the manufacturer's own
  capitalisation is a brand question, not a data-cleanup one. The storefront currently shows
  `DynaCare`; 30 products carry `dynaCare` and 3 carry `DynaCare`. Confirm the official form.
* **`custom.brand_name` — `LifeSign` / `lifeSign`.** Same question, smaller: 2 vs 1 product.

### Related, not a duplicate — also worth a look

* `custom.customer_filter_category` carries the value **`Manual Wheelchairs 24`** on one Home
  Care product. That is an attribute-patterned value (a width modifier), and
  `ATTRIBUTE_SUBCATEGORY_PATTERNS` in `lib/category-tree.ts` deliberately keeps values of that
  shape out of the subcategory tree. It leaks into the Category facet on
  `/category/home-care/shower-commodes`. Not merged by the storefront — it is not a duplicate
  of anything, it just looks out of place.
* `custom.customer_filter_category` carries a value **identical to the category itself** on
  several routes (`Home Care` on 32 Home Care products, `Apparel` on 1 Apparel product). It
  renders as a filter that narrows a category to a subset of itself. Same class of redundancy
  as the self-titled `category:`/`subcategory:` tag pairs already documented in
  `buildL2Tree`; left alone here pending the same decision.

---

## The 18 groups, with product evidence

### `custom.customer_filter_category` — Gauze Roll / Gauze Rolls

First seen on: `wound-care` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Gauze Roll` | 19 | `sterile-rolled-gauze-2-ply-2-x-5-yd-copy` — Dukal  Sterile Rolled Gauze, 2-Ply, 2" x 5 yd, Pack of 12 (452) — `wound-care`<br>`kemp-usa-compressed-krinkle-gauze-roll-non-sterile-4-5-x-4-1-yd-100-pcs` — Kemp USA Compressed Krinkle Gauze Roll Non-Sterile (4.5" x 4.1 yd) (100 pcs) — `wound-care`<br>`kemp-usa-compressed-krinkle-gauze-roll-non-sterile-4-5-x-4-1-yd-1-roll` — Kemp USA Compressed Krinkle Gauze Roll Non-Sterile (4.5" x 4.1 yd) (1 roll) — `wound-care`<br>`gauze-roll-36x100-yds-40s-20x12-mesh-12-rolls-cs` — Gauze Roll 36"x100 Yds, 40s - 20x12 Mesh - 12 rolls/cs. (MPR-60990) — `wound-care`<br>`krinkle-gauze-roll-sterile-100-cs` — Krinkle Gauze Roll, Sterile (MPR-60373) — `wound-care`<br>`krinkle-gauze-roll-n-s-100-cs` — Krinkle Gauze Roll - N/S - 100/cs. (MPR-60353) — `wound-care`<br>`stretch-gauze-bandage-roll-n-s-6-8-6-cs` — Stretch Gauze Bandage Roll, 6" (MPR-60306) — `wound-care`<br>`stretch-gauze-bandage-roll-n-s-3-8-12-cs` — Stretch Gauze Bandage Roll, 3" (MPR-60303) — `wound-care`<br>…and 11 more |
| `Gauze Rolls` | 1 | `gauze-roll-bandage-1-unit-4-x-6-yd-100-1-cs` — Compress Gauze Roll Bandage, 4" x 6 yds (3197UB-1) — `wound-care` |

### `custom.other_features` — 2 Y-Site / 2 Y-Sites

First seen on: `needles-syringes` · facet label "Other Features"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `2 Y-Site` | 2 | `iv-administration-pump-set-compatible-with-flogard-and-spectrum-1-y-site-10-drops-ml-105-tcbinf6571` — IV Administration Pump Set, Compatible with FloGard and Spectrum, 0.2um GVS Filter, 2 Y-Site, 10 Drops/mL, 105" (TCBINF6571) — `iv-therapy`<br>`iv-admin-set-97-2-y-site-tcbinf6519` — IV Administration Pump Set, Compatible with FloGard and Spectrum, BC Valve, 2 Y-Site, 10 Drops/mL, 97" (TCBINF6519) — `iv-therapy` |
| `2 Y-Sites` | 1 | `iv-administration-set-with-flow-regulator-2-needle-free-y-sites-100-10-drops-ml-tcbinf2nfrb` — IV Administration Set with Flow Regulator, 2 Needle Free Y-Sites, 100", 10 Drops/mL (TCBINF2NFRB) — `iv-therapy` |

### `custom.type` — Test Strip / Test Strips

First seen on: `testing-screening` · facet label "Type"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Test Strip` | 1 | `chem-55001` — ALCO-Screen Saliva Alcohol Testing Kits (CHEM-55001) — `testing` |
| `Test Strips` | 1 | `accutest-value-rapid-hcg-test-strips` — Accutest Value+ Rapid hCG Test Strips (PF851) — `testing` |

### `custom.tests_for` — COVID-19 / Covid-19

First seen on: `testing-screening` · facet label "Tests For"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `COVID-19` | 8 | `lifesign-status-covid-19-flu-a-b-eua-authorized-box-of-25-lfs-33225` — Lifesign Status, COVID-19/Flu A&B, EUA Authorized, Box of 25 (LFS 33225) — `testing`<br>`cordx-tyfast-flu-a-b-covid-19-at-home-rapid-multiplex-test-display-boxes-act21002-110` — CorDx Tyfast, Flu A/B & COVID-19 At Home Rapid Multiplex Test, Display Boxes (ACT21002-110) — `testing`<br>`flu-covid-rapid-test-clia-waived-no-analyzer-cordx-25` — Flu A/B + COVIDâ€‘19 Multiplex Rapid Test, Cordx Tyfast, Box of 25 (ACT21001-25) — `testing`<br>`flowflex-plus-covid-19-and-flu-a-b-home-test-2-tests-box` — Flowflex PLUS COVID-19 and Flu A/B Home Test (IDL03AR0745) — `testing`<br>`flowflex-plus-covid-19-and-flu-a-b-home-test-1-test-box` — Flowflex PLUS COVID-19 and Flu A/B Home Test - 1 Test/Box (IDL03AR0645) — `testing`<br>`flowflex-covid-19-antigen-home-test-2-tests-box` — Flowflex COVID-19 Antigen Home Test - 2 Tests/Box (IDL031125M5) — `testing`<br>`flowflex-covid-19-antigen-home-test-1-test-box` — Flowflex COVID-19 Antigen Home Test - 1 Test/Box (IDL031118B5) — `testing`<br>`genbody-covid-19-rapid-antigen-tests-genb-covag025-nu-1` — GenBody COVID-19 Rapid Antigen Tests (GENB-COVAG025-NU-1) *CLIA Certificate Required* (GENB-COVAG025-NU-1) — `testing` |
| `Covid-19` | 3 | `flowflex-covid-19-antigen-home-rapid-test-case-of-300-ac-l031-118b5` — Flowflex, COVID -19 Antigen Home Rapid Test, Case of 300 (AC-L031-118B5) — `testing`<br>`quidel-quickvue-sars-antigen-dipstick-cliawaived-qui-20387` — Quidel QuickVue SARS Antigen Dipstick, CLIAwaived (QUI 20387) — `testing`<br>`quickvue-at-home-otc-covid-19-test-rapid-results-25-test-kit-qui-20398` — QuickVue At-Home OTC COVID-19 Test, Rapid Results, 25 test/kit (QUI 20398) — `testing` |

### `custom.brand_name` — LifeSign / lifeSign

First seen on: `testing-screening` · facet label "Brand Name"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `LifeSign` | 2 | `status-strep-a-plus-clia-waived-50-tests-lfs-34250` — Status Strep A Plus, CLIA Waived, 50 tests (LFS 34250) — `testing`<br>`lifesigns-status-flu-a-b-clia-waived-for-swab-specimens-lfs-36025` — Lifesigns, Status Flu A&B, CLIA Waived for Swab Specimens (LFS 36025) — `testing` |
| `lifeSign` | 1 | `lifesign-status-covid-19-flu-a-b-eua-authorized-box-of-25-lfs-33225` — Lifesign Status, COVID-19/Flu A&B, EUA Authorized, Box of 25 (LFS 33225) — `testing` |

### `custom.customer_filter_category` — Tracheostomy Care Kit / Tracheostomy Care Kits

First seen on: `respiratory` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Tracheostomy Care Kit` | 1 | `sterile-tracheostomy-care-kit` — Sterile Tracheostomy Care Kit (15200) — `respiratory` |
| `Tracheostomy Care Kits` | 4 | `tracheostomy-care-kit-w-2-vinyl-gloves-20-trays-cs-us-only` — Tracheostomy Care Kit w/ 2 Vinyl Gloves, 20 trays/cs (US Only) (CRF 4681A) — `respiratory`<br>`tracheostomy-care-kit-one-mini-compartment-tray-40-cs` — Tracheostomy Care Kit, Mini Compartment Tray, with Hydrogen Peroxide, 40/Case (35009) — `respiratory`<br>`tracheostomy-care-kit-three-compartment-tray-20-cs` — Tracheostomy Care Kit, Three Compartment Tray, with Vinyl Gloves 20/Case (35001) — `respiratory`<br>`tracheostomy-care-kit-one-compartment-tray-20-cs` — Tracheostomy Care Kit - One Compartment Tray, 20/Case (35000) — `respiratory` |

### `custom.customer_filter_category` — Lotion / Lotions

First seen on: `hygiene` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Lotion` | 1 | `peach-dream-13-5oz-24-cs` — Peach Dream - 13.5oz 24/cs. (214) — `hygiene` |
| `Lotions` | 5 | `dermasoft-advance-lotion-w-aloe-fresh-7-5oz-48-cs` — DermaSoft Advance Lotion w/Aloe Fresh 7.5oz 48/cs. (112) — `hygiene`<br>`fragrance-free-hand-and-body-lotion-2-oz` — Fragrance Free Hand and Body Lotion (HLF02) — `hygiene`<br>`petroleum-jelly-2-oz` — Petroleum Jelly 2 oz (PJ4326) — `hygiene`<br>`hand-and-body-lotion-2-oz` — Hand and Body Lotion, Case (HL02) — `hygiene`<br>`hand-and-body-lotion-35-oz` — Hand and Body Lotion .35 oz (PH10) — `hygiene` |

### `custom.customer_filter_category` — Shaving Cream / Shaving Creams

First seen on: `hygiene` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Shaving Cream` | 6 | `brushless-shave-cream-125-oz` — Brushless Shave Cream, Single Use, 0.125 oz (PBS35) — `hygiene`<br>`brushless-shave-cream-0-6-oz` — Brushless Shave Cream (BS06) — `hygiene`<br>`shave-gel-85-oz-clear` — Shave Gel .85 oz, Clear (SGW4807) — `hygiene`<br>`brushless-shave-cream-25-oz` — Brushless Shave Cream .25 oz (PBS70) — `hygiene`<br>`shave-cream-1-5-oz` — Shave Cream 1.5 oz, Case of 144 (SC15) — `hygiene`<br>`shave-cream-11-oz` — Shave Cream, 11 oz, Case of 12 (SC110-12) — `hygiene` |
| `Shaving Creams` | 1 | `shaving-cream-11-oz-4249` — Shaving Cream, Case (4249) — `hygiene` |

### `custom.customer_filter_category` — Toothbrush Holder / Toothbrush Holders

First seen on: `hygiene` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Toothbrush Holder` | 4 | `toothbrush-holder-100-cs` — Toothbrush Holder, Case (4864) — `hygiene`<br>`toothbrush-tube-lg` — Toothbrush Tube, Assorted Colors (MILDTHLB1A12) — `hygiene`<br>`toothbrush-tube-clear` — Toothbrush Tube (MILDTHLU0072NU) — `hygiene`<br>`toothbrush-holder-clear-tbh01c` — Toothbrush Holder (TBH01C) — `hygiene` |
| `Toothbrush Holders` | 1 | `new-world-imports-toothbrush-cap-box-tbcap` — New World Imports, Toothbrush Cap, Box (TBCAP) — `hygiene` |

### `custom.brand_name` — dynaCare / DynaCare

First seen on: `hygiene` · facet label "Brand Name"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `dynaCare` | 30 | `manicure-brushes-2-5-long-24-12-cs` — Manicure Brushes, 2.5" Long, 24/12/cs (4896) — `hygiene`<br>`toenail-clipper-12-12-cs` — Toenail Clipper, 12/12/cs (4893) — `hygiene`<br>`fingernail-clipper-24-24-cs` — Fingernail Clipper, 24/24/cs (4891) — `hygiene`<br>`hair-pick-288-cs` — Hair Pick, 288/cs (4888) — `hygiene`<br>`large-handle-comb-8-5-288-cs` — Large Handle Comb, 8.5", 288/cs (4887) — `hygiene`<br>`adult-combs-9-black-20-12-cs` — Adult Combs, 9", Black, Case (4886) — `hygiene`<br>`adult-combs-7-black-20-12-cs` — Adult Combs, 7", Black, Case (4885) — `hygiene`<br>`adult-combs-5-black-20-12-cs` — Adult Combs, 5", Black, Case of 240 (4884) — `hygiene`<br>…and 37 more |
| `DynaCare` | 3 | `baby-powder-talc-free-case-of-48-4874-cs-copy` — Baby Powder (Talc-Free), 14 oz, Case of 48 (4875-CS) — `hygiene`<br>`baby-powder-talc-free-case-of-48-4874-cs` — Baby Powder (Talc-Free), Case of 48 (4874-CS) — `hygiene`<br>`super-plus-tampons-plastic-applicator-12-15gr-absorbency-10-20-cs` — Super Plus Tampons Plastic Applicator, 12-15gr absorbency, 10/20/cs (1357SP) — `incontinence`<br>`super-tampons-plastic-applicator-9-12gr-absorbency-9-25-cs` — Super Tampons Plastic Applicator, 9-12gr absorbency, 9/25/cs (1357S) — `incontinence`<br>`regular-tampons-plastic-applicator-bulk-6-9gr-absorbency-500-cs` — Regular Tampons Plastic Applicator - Bulk, 6-9gr absorbency, 500/cs (1357R-Bulk) — `incontinence`<br>`regular-tampons-plastic-applicator-6-9gr-absorbency-9-25-cs` — Regular Tampons Plastic Applicator, 6-9gr absorbency, 9/25/cs (1357R) — `incontinence`<br>`super-plus-tampons-cardboard-applicator-12-15gr-absorbency-10-20-cs` — Super Plus Tampons Cardboard Applicator, 12-15gr absorbency, 10/20/cs (1355SP) — `incontinence`<br>`super-tampons-cardboard-applicator-9-12gr-absorbency-9-25-cs` — Super Tampons Cardboard Applicator, 9-12gr absorbency, 9/25/cs (1355S) — `incontinence`<br>…and 13 more |

### `custom.customer_filter_category` — Bath Mat / Bath Mats

First seen on: `home-care` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Bath Mat` | 1 | `bath-mat-sure-safe-white-lumex` — BATH MAT SURE-SAFE WHITE LUMEX (2050A) — `home-care` |
| `Bath Mats` | 1 | `bathtub-shower-mat` — Bathtub Shower Mat — `home-care` |

### `custom.customer_filter_category` — Bed Wedge / Bed Wedges

First seen on: `home-care` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Bed Wedge` | 1 | `lumex-essentls-folding-bed-wedge-7` — LUMEX ESSENTLS FOLDING BED WEDGE 7" (LE247) — `home-care` |
| `Bed Wedges` | 1 | `bed-wedge-12-height` — Bed Wedge, 12" Height — `home-care` |

### `custom.customer_filter_category` — Grab Bar / Grab Bars

First seen on: `home-care` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Grab Bar` | 4 | `suction-cup-grab-bar-12-white-and-beige` — Suction Cup Grab Bar, 12", White and Beige — `home-care`<br>`powder-coated-grab-bar-white` — Powder Coated Grab Bar, White — `home-care`<br>`egress-bar-w-rh-pullout` — EGRESS BAR w/ RH PULLOUT (GL93600R) — `home-care`<br>`egress-bar-w-lh-pullout` — EGRESS BAR w/ LH PULLOUT (GL93600L) — `home-care` |
| `Grab Bars` | 2 | `adjustable-height-bathtub-grab-bar-safety-rail` — Adjustable Height Bathtub Grab Bar Safety Rail — `home-care`<br>`adjustable-angle-rotating-suction-cup-grab-bar` — Adjustable Angle Rotating Suction Cup Grab Bar — `home-care` |

### `custom.customer_filter_category` — Pressure Relief Cushion / Pressure Relief Cushions

First seen on: `home-care` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Pressure Relief Cushion` | 1 | `ring-cushion-navy-lumex` — RING CUSHION NAVY LUMEX (DM81) — `home-care` |
| `Pressure Relief Cushions` | 1 | `alternating-pressure-air-cushion-1pc-bx` — Alternating Pressure Air Cushion 10675 (10675) — `home-care` |

### `custom.customer_filter_category` — Shower Commode / Shower Commodes

First seen on: `home-care` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Shower Commode` | 6 | `lightweight-portable-shower-commode-chair-with-casters` — Lightweight Portable Shower Commode Chair with Casters (11114KD-1) — `home-care`<br>`tilting-aluminum-rehab-shower-chair-commode` — Tilting Aluminum Rehab Shower Chair Commode (NRS18010) — `home-care`<br>`upholstered-drop-arm-wheeled-commode` — Upholstered Drop Arm Wheeled Commode (11120SV-1F) — `home-care`<br>`aluminum-shower-mobile-commode-transport-chair` — Aluminum Shower Mobile Commode Transport Chair — `mobility`<br>`aluminum-shower-commode-transport-chair` — Aluminum Shower Commode Transport Chair — `mobility`<br>`folding-rehab-shower-commode-chair-24in-wheels` — Folding Rehab Shower Commode Chair, 19" High Back, 24" Rear Wheel, 300 lbs Weight Capacity (12023110) — `home-care`<br>`folding-rehab-shower-commode-low-back-24in` — Folding Rehab Shower Commode Chair, 14.5" Low Back, 24" Rear Wheel, 250 lbs Weight Capacity (12022010) — `home-care`<br>`shower-commode-chair-28-ss-750-lb-rfa-rft-21-7-stf-lck-cstrs-push-hndl` — SHOWER/COMMODE CHAIR 28" SS 750 LB RFA &RFT 21.7 STF LCK  CSTRS PUSH HNDL (5228) — `home-care` |
| `Shower Commodes` | 4 | `exten-legs-4-for-7927-7929-lumex` — EXTEN LEGS 4" FOR 7927/7929 LUMEX (79294A) — `home-care`<br>`shwr-chr-pvc-knck-down-22-ins-w-5-casters-lumex` — SHWR CHR PVC KNCK DOWN 22" INS W/5" CASTERS LUMEX (89200-KD-5C) — `home-care`<br>`shwr-chr-pvc-knck-down-18-ins` — SHWR CHR PVC KNCK DOWN INS (89100-KD) — `home-care`<br>`shwer-chr-pvc-cmd-18in-w-fr-dd-with-dda` — SHWER CHR PVC CMD 18IN W/FR DD WITH DDA (89116) — `home-care` |

### `custom.customer_filter_category` — Lifeguard Umbrella / Lifeguard Umbrellas

First seen on: `emergency-supplies` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Lifeguard Umbrella` | 1 | `kemp-usa-7-5-guard-heavy-duty-beach-umbrella-w-aluminum-pole-red` — Kemp USA 7.5' GUARD Heavy-Duty Beach Umbrella w/ Aluminum Pole, Red — `emergency-supplies` |
| `Lifeguard Umbrellas` | 13 | `kemp-usa-umbrella-base-stand` — Kemp USA Umbrella Base Stand — `emergency-supplies`<br>`kemp-usa-6-viny-umbrella-solid-color-royal-blue` — 6' Vinyl Umbrella, Royal Blue (12-010-ROY) — `emergency-supplies`<br>`kemp-usa-6-viny-umbrella-solid-color-red` — 6' Viny Umbrella, Red (12-010-RED) — `emergency-supplies`<br>`kemp-usa-polyester-fabric-life-guard-logo-red` — LIFE GUARD Umbrella, with logo, Polyester Fabric (12-009-RED-GRD) — `emergency-supplies`<br>`kemp-usa-polyester-fabric-green-white-6-umbrella` — 6' Beach Umbrella, Polyester Fabric, Green and White (12-008-GRN/WHI) — `emergency-supplies`<br>`kemp-usa-automatic-travel-umbrella-auto-open-close-compact-black` — Kemp USA Automatic Travel Umbrella, Auto Open / Close, Compact, Black — `emergency-supplies`<br>`kemp-usa-6-viny-umbrella-with-life-guard-logo-royal-blue` — Kemp USA 6' Viny Umbrella with LIFE GUARD Logo, Royal Blue — `emergency-supplies`<br>`kemp-usa-5-5-wind-umbrella-silver-pine-green` — 5.5' Wind Umbrella, Silver / Pine Green (12-003-S-PG) — `emergency-supplies`<br>…and 5 more |

### `custom.customer_filter_category` — Bariatric Trapeze Bar / Bariatric Trapeze Bars

First seen on: `bariatric` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Bariatric Trapeze Bar` | 1 | `floor-stand-trapeze-850-bariatric-a-size-5160` — FLOOR STAND TRAPEZE 850# BARIATRIC A SIZE (5160) — `bariatric` |
| `Bariatric Trapeze Bars` | 4 | `bariatric-heavy-duty-trapeze-bar-silver-vein` — Bariatric Heavy Duty Trapeze Bar, Silver Vein — `bariatric`<br>`trapeze-bariatric-600lb-wt` — TRAPEZE BARIATRIC 600LB WT (2960B) — `bariatric`<br>`trapeze-bariatric-450-lb-wt` — TRAPEZE BARIATRIC 450 LB WT (2940B) — `bariatric`<br>`bariatric-trapeze-bar-w-stand-1pc-cs` — Bariatric Trapeze Bar w/ Stand 10712 (10712) — `bariatric` |

### `custom.customer_filter_category` — Bed / Beds

First seen on: `room-furniture` · facet label "Category"

| Raw value | Products | Evidence (handle — title — `category:` tags) |
|---|---|---|
| `Bed` | 304 | _(tag-sourced route; per-product list omitted — count measured live)_ |
| `Beds` | 149 | _(tag-sourced route; per-product list omitted — count measured live)_ |

---

## Reproducing this

Read-only, against production Storefront credentials:

```graphql
# The duplicate values themselves
query { collection(handle: "home-care") { products(first: 1) {
  filters { id label values { label count input } } } } }

# What a value actually matches — note NO productFilters in the selection set,
# see lib/shopify/queries/products.ts for why that matters
query($f: [ProductFilter!]) {
  search(query: "tag:\"category:home-care\" AND tag:\"subcategory:shower-commodes\"",
         types: PRODUCT, first: 1, productFilters: $f) { totalCount } }
```

## What the storefront does in the meantime

`lib/catalog/facet-canonicalization.ts` holds these 18 groups. For each one the rail shows a
single option under the canonical spelling, and `expandFilterInputs` turns that one URL
parameter back into every raw value before the query is issued — Shopify ORs filters that share
a metafield key, so the merged option returns the union of both spellings. Nothing is hidden
and nothing is renamed in Shopify.

When a group is collapsed at source, its entry here becomes a harmless no-op (the extinct
spelling simply stops appearing in any facet response) and can be deleted from the registry at
leisure. `lib/__tests__/facet-canonicalization.test.ts` guards the registry's shape.

---

## Appendix — pre-existing findings turned up on the way, NOT fixed here

Each of these reproduces on `catalog-cro-review` with this branch's changes stashed, so they
are recorded rather than fixed: they are outside the nav/filter scope of this pass and each
needs its own decision.

**1. `tag:"subcategory:<x>"` matches by token, not exactly.** Shopify's search-query `tag:`
operator is tokenised, so the L2 page query `tag:"category:mobility" AND
tag:"subcategory:walkers"` also matches `subcategory:folding-walkers`,
`subcategory:posterior-walkers`, `subcategory:knee-walkers` and
`subcategory:wheeled-walkers`. Result: `/category/mobility/walkers` renders 43 products while
`buildL2Tree` — which reads each product's own tag list and is exact — counts 20 for that
node. The nav count and the page's own count disagree by design of the query, on every L2
route whose tag shares a token with a sibling. Owner: Sardor (query construction, not data).

**2. `/category/mobility/wheelchairs` does not exist, and that is correct.** No product in the
7,385-product tag scan carries `subcategory:wheelchairs` (the live tag search returns 205 only
because of finding 1 — it is matching `manual-wheelchairs`, `reclining-wheelchairs`,
`pediatric-wheelchairs` and so on). The QA list's "Wheelchairs" is reachable as a Category
FACET value on `/category/mobility`, not as an L2 route. Nothing to fix; recorded so the next
QA pass does not chase it.

**3. `/category/apparel` resolves but is not a registered route.** It returns 200 with 153
products titled "Apparel", yet has no `filterRegistry` entry — Apparel is registered under its
Shopify handle `capes-gowns`, which is its canonical public slug. The unregistered URL
therefore falls through to `DEFAULT_FACET_RULES` and renders Availability + Price only, and
its active-filter chip prints raw filter JSON because the label map is empty. Either the
collection should not be linkable at that URL or it needs a redirect to `/category/capes-gowns`.
Owner: Sardor (route registry).

**4. The homepage scrolls horizontally at 320px.** 336px of content in a 320px viewport, from
the hero's `animate-pulse` skeleton boxes, which sit at `left: -16px`. Reproduced on
`catalog-cro-review` with this branch stashed, both mid-load and after network idle.
`e2e/320px-overflow.spec.ts` catches it only intermittently, because whether the skeleton is
still on screen when the assertion runs depends on load timing. Owner: Sardor (homepage hero).

**5. `e2e/categories-hub-integration.spec.ts:62` fails on the base branch.** "Popular
Categories strip never contradicts the full grid" expects the hub's full grid to contain
"Trocars & Trocar Kits"; the grid renders the 25 L1 departments and Trocars is a featured
subcategory, so it is in the Popular strip but not the grid. Fails on `catalog-cro-review`
with this branch stashed, on both Playwright projects. Owner: Sardor (the test encodes an
assumption the P0.5 Trocar split invalidated).
