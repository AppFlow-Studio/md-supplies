# DEV-LAUNCH-06 — QA-store catalog fixtures (read-only, Storefront API)

Generated: 2026-08-07T20:36:10.835Z
Store queried: `md-supplies-qa-shipping-and-checkout.myshopify.com`

Bootstrapped by `scripts/qa-catalog-fixtures.ts` (read-only Storefront API queries, no Admin scope needed) because no canonical "Izzy QA fixture handles and GIDs" registry exists yet for category/OCC/industry browsing (the closest analog, `data/shipping-facts-qa.json`, is scoped to shipping display only). Use the handles/GIDs below for e2e fixtures instead of production-specific IDs. Re-run this script whenever QA store data changes.

## L1 categories

| Tag (route slug*) | Collection handle | Live on QA? | GID | Product count | Sample products |
|---|---|---|---|---|---|
| `gloves` (`gloves`) | `gloves` | ✅ | `gid://shopify/Collection/474091159785` | 40 | exam-glove-nitrile-medium-blue-100-bx-10-bx-cs, ammex®-nitrile-gloves-x-large-disposable-exam-grade-black-powder-free-smooth-polymer-coated-100-bx-10bx-cs-us-sales-only-products-cannot-be-sold-on-amazon-com-or-any-other-third-party-sites-to-be-discontinued, ammex®-nitrile-gloves-small-disposable-exam-grade-blue-powder-free-smooth-polymer-coated-100-bx-10bx-cs-us-sales-only-products-cannot-be-sold-on-amazon-com-or-any-other-third-party-sites-to-be-discontinued |
| `wound-care` (`wound-care`) | `wound-care` | ✅ | `gid://shopify/Collection/474091192553` | 40 | sterile-soft-flexible-fabric-adhesive-bandages-1-x-3, sterile-metal-detectable-lightweight-fabric-adhesive-bandages-1-x-3-blue, sterile-lightweight-flexible-fabric-adhesive-bandages-3-4-x-3 |
| `needles-syringes` (`needles-syringes`) | `needles-syringes` | ✅ | `gid://shopify/Collection/474091225321` | 69 | syringe-luer-lock-20-cc-10-50-cs, iv-administration-set-83-tcbinfsp1, iv-administration-set-60-drop-83-1-needleless-port-1-inje-50-bx |
| `surgical-sutures` (`surgical-sutures`) | `surgical-sutures` | ✅ | `gid://shopify/Collection/474091258089` | 40 | unify-pga-surgical-sutures-size-5-0-18-thread-13mm-3-8-circle-r-c-needle-undyed-s-g518r13-u, unify-pga-surgical-sutures-size-4-0-30-thread-17mm-1-2-circle-taper-point-needle-undyed-m-g430t17-u, suture-removal-kit-sterile-50-cs |
| `testing` (`testing-screening`) | `testing-screening` | ✅ | `gid://shopify/Collection/474091290857` | 40 | urs-reader-and-starter-kit-4-prm395, urs-10-urine-reagent-strips-ua870, accutest-splitcup-5-panel-urine-drug-test-ds02ac625 |
| `exam-room` (`exam-room`) | `exam-room` | ✅ | `gid://shopify/Collection/474091323625` | 45 | sterile-alcohol-pad-2-ply-medium, phys-stool-w-bck-blk-bse-wwd-wedgewood, phys-stool-blk-bse-sgl-lever-wedgewood |
| `respiratory` (`respiratory`) | `respiratory` | ✅ | `gid://shopify/Collection/474091356393` | 40 | universal-suction-machine-tubing-and-filter-replacement-kit-with-canister-pack-of-1, trim-line-cpap-tube-6, trach-plug-jackson-6-1037836-john-bunn-1037836 |
| `mobility` (`mobility`) | `mobility` | ✅ | `gid://shopify/Collection/474091389161` | 40 | walkabout-alluralx-rollator-black-lumex, walkabout-alluralx-rollator-apple-red-lumex, walkabout-allura-rollator-black-lumex |
| `patient-therapy-rehab` (`patient-therapy-rehab`) | `patient-therapy-rehab` | ✅ | `gid://shopify/Collection/474091421929` | 40 | dynarex-actisplint-folded-flat-24-50-cs, back-support-universal-626-low-profile-sm-4x, armsling-xs |
| `surgery-procedure` (`trocars-trocar-kits`) | `trocars-trocar-kits` | ✅ | `gid://shopify/Collection/474091454697` | 40 | 4-5mm-premium-disposable-stainless-steel-trocar-wrap-kit-large-gloves-b9176c, 4-5mm-disposable-stainless-steel-trocar-wrap-kit-b9807, 4-5mm-disposable-stainless-steel-diamond-tip-trocar-tray-kit-medium-gloves-b1560 |
| `apparel` (`capes-gowns`) | `capes-gowns` | ✅ | `gid://shopify/Collection/474091487465` | 40 | surgical-gowns-reinforced-medium-20pouches-cs, protective-cover-gown-xl, protective-cover-gown-blue |
| `hygiene` (`hygiene`) | `hygiene` | ✅ | `gid://shopify/Collection/474091520233` | 42 | toothbrush-adult-39tuft-144-c-grafco, toothbrush-adult-32tuft-144-gr-grafco, periscent-scented-perineal-cleanser-8-oz-48-cs |
| `disinfectants` (`disinfectants`) | `disinfectants` | ✅ | `gid://shopify/Collection/474091553001` | 36 | surface-safe-2-step-applicator-kit-case-ken-ss33508, sterile-isopropyl-alcohol-wipers-tcbwalc30, soap-tincture-of-green-gal-4-c-grafco |
| `home-care` (`home-care`) | `home-care` | ✅ | `gid://shopify/Collection/474091585769` | 40 | beveled-edge-floor-pad-lumex, bellavita-side-flap, bellavita-rotating-and-transfer-aid |
| `emergency-supplies` (`emergency-supplies`) | `emergency-supplies` | ✅ | `gid://shopify/Collection/474091618537` | 40 | kemp-usa-polyester-fabric-green-white-6-umbrella, kemp-usa-life-jackets-4-pack-in-carry-case-2-blue-2-red-adult, kemp-usa-life-jacket-red-black-adult |
| `incontinence` (`incontinence`) | `incontinence` | ✅ | `gid://shopify/Collection/474091651305` | 40 | washcloth-8-x-12, pre-moistened-washcloths-8-x-10-scented, pre-moistened-washcloths-8-x-10-fragrance-free |
| `iv-therapy` (`iv-therapy`) | `iv-therapy` | ✅ | `gid://shopify/Collection/474091684073` | 41 | iv-winged-catheter-24g-x-3-4-box-381512, iv-administration-set-83-tcbinfsp1, iv-administration-set-60-drop-83-1-needleless-port-1-inje-50-bx |
| `urology-ostomy` (`urology-ostomy`) | `urology-ostomy` | ✅ | `gid://shopify/Collection/474091716841` | 40 | urinary-leg-bags-med-600ml-sterile-4-12-cs, urinary-leg-bags-lg-1000ml-sterile-4-12-cs, urinary-drainage-bags-2000ml-sterile-20-cs |
| `sterilization` (`sterilization`) | `sterilization` | ✅ | `gid://shopify/Collection/474091749609` | 40 | sterilization-pouches-7-5-x-13, sterilization-pouches-7-1-2-x-13, sterilization-pouches-5-25-x-10 |
| `dental` (`dental`) | `dental` | ✅ | `gid://shopify/Collection/474091782377` | 40 | endodontic-irrigation-syringe-needle-luer-lock-27g-x-1-1-4-31-7mm-yellow-sterile-case-8881513850, endodontic-irrigation-syringe-needle-luer-lock-27g-x-1-1-4-31-7mm-yellow-sterile-box-8881513850, endodontic-irrigation-syringe-needle-luer-lock-23g-x-1-1-4-31-7mm-orange-sterile-case-8881513843 |
| `housekeeping-janitorial` (`housekeeping-janitorial`) | `housekeeping-janitorial` | ✅ | `gid://shopify/Collection/474091815145` | 40 | zipper-bags-9x12-10-100-cs, zipper-bags-4x6-10-100-cs, zipper-bags-10x13-10-100-cs |
| `bariatric` (`bariatric`) | `bariatric` | ✅ | `gid://shopify/Collection/474091847913` | 40 | bariatric-hd-headboard-footboard-for-db600-cherry-1pc-cs, bariatric-hd-full-electric-homecare-bed-54-1pc-cs, bariatric-hd-full-electric-homecare-bed-48-1pc-cs |
| `room-furniture` (`seating`) | `seating` | ✅ | `gid://shopify/Collection/474091913449` | 8 | phys-stool-w-bck-blk-bse-wwd-wedgewood, phys-stool-blk-bse-sgl-lever-wedgewood, phys-stool-blk-base-foot-ring-wedgewood |
| `face-masks` (`face-masks`) | `face-coverings` | ✅ | `gid://shopify/Collection/474091946217` | 1 | beard-covers |
| `pharmacy-products` (`pharmacy-products`) | `pharmacy-products` | ✅ | `gid://shopify/Collection/474091978985` | 49 | sunrise-phentermine-37-5mg-lue-speck-tab-civ-1000-ndc-11534-0160-03, style-ttt-laser-rx-label-8-5-x-14-w-blue-highlights-5771c-rx, somerset-cyanocobalamin-vitamin-b12-1000mcg-ml-injection-mdv-30ml-70069-0171-10 |

\* Route slug is the collection handle unless a `canonicalSlug` override exists in `lib/category-nav.ts` (only `face-masks` today).

## OCC

Canonical handle resolved by `getOccCollectionHandle()`: `occ`

| Live on QA? | GID | Product count | Sample products |
|---|---|---|---|
| ❌ | `—` | — | — |

**Status**: resolves on the QA store as of this run (handle NOT FOUND — OCC page will render its "temporarily unavailable" fallback). Production canonical confirmation is still pending Izzy (IZ-01 in docs/TASK-REGISTER-2026-08-03.md) — this only verifies the QA store, not production.

### OCC-adjacent collections (subcategory nav links, not registry-backed)

| Handle | Live on QA? | GID | Product count |
|---|---|---|---|
| `hygiene-kits` | ❌ | `—` | — |
| `school-supplies` | ❌ | `—` | — |
| `backpacks` | ❌ | `—` | — |

## Industries (tag-backed discovery)

| Slug | Tag | Products found on QA (capped at 5) | Sample products |
|---|---|---|---|
| `urgent-care` | `industry:urgent-care` | 5 | green-soap-1-gal-bottle-4-cs, instaclean-1000-ml-10-cs, machine-bag-5-x-5-16-500-cs, suction-connection-tubing-w-male-connector-non-conductive-1-4-x-10-tube-50-cs, silicone-foley-catheters-2-way-standard-26-fr-5-10cc-10-bx |
| `hrt-clinics` | `industry:hrt-surgery` | 5 | suture-removal-kit-sterile-50-cs, 3-2mmthree-piece-surgical-titanium-trocar-set-86035-dpti, 3-5mm-stainless-steel-trocar-tray-kit-with-antiseptic-large-gloves-b1352, 3-5mm-stainless-steel-trocar-2cm-tray-kit-with-antiseptic-medium-gloves-b1354, 3-5mm-premium-stainless-steel-trocar-pellet-insertion-wrap-kit-large-glove-b9175c |
| `home-health` | `industry:home-care` | 5 | after-shave-lotion-alcohol-free-4-oz-48-cs, d-cerin-3-75-oz-tube-24-cs, 12022110-replacement-24-rear-wheel-90-011b1j, calasoothe-skin-protectant-3-5-g-packet-2-144-cs, disposable-underpads-17-x-24-22-g-3-100-cs |
| `clinics-doctors-offices` | `industry:clinic` | 5 | aspirator-tips-white-1-8-x-6-1-4, digital-x-ray-sensor-sleeves-1-3-8-x-8, blu-tray-impression-trays-perforated-lg-upper-1, blu-tray-impression-trays-perforated-lg-lower-2, anterior-impression-tray-lower-no-10-12pc-bag-10-bags-cs |
| `pharmacies` | `industry:pharmacy` | 5 | accutest-mononucleosis-rapid-test-id516, narcotic-safe-hd-steel-grafco, golden-mortar-bags-flat-bottom-small-6-6-x-3-625-x-11-12607, printed-pill-envelope-1000-bx-grafco-3-5-x-2-5, clotrimazole-1-antifungal-cream-1oz-tubes-indv-boxed-72-cs |

