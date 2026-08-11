# DEV-LAUNCH-06 — QA-store catalog fixtures (read-only, Storefront API)

Generated: 2026-08-11T17:47:39.945Z
Store queried: `md-supplies-qa-shipping-and-checkout.myshopify.com`

Bootstrapped by `scripts/qa-catalog-fixtures.ts` (read-only Storefront API queries, no Admin scope needed) because no canonical "Izzy QA fixture handles and GIDs" registry exists yet for category/OCC/industry browsing (the closest analog, `data/shipping-facts-qa.json`, is scoped to shipping display only). Use the handles/GIDs below for e2e fixtures instead of production-specific IDs. Re-run this script whenever QA store data changes.

## L1 categories

| Tag (route slug*) | Collection handle | Live on QA? | GID | Product count | Sample products |
|---|---|---|---|---|---|
| `gloves` (`gloves`) | `gloves` | ✅ | `gid://shopify/Collection/474091159785` | 42 | surgical-gloves-size-5-50-pr-bx-4-bx-cs-us-only, exam-glove-nitrile-x-small-powder-free-textured-finger-cobalt-blue-non-sterile-250-bx-10-bx-cs, exam-glove-nitrile-medium-blue-100-bx-10-bx-cs |
| `wound-care` (`wound-care`) | `wound-care` | ✅ | `gid://shopify/Collection/474091192553` | 55 | tonka-stat-strip-adhesive-bandages-3-4-x-3, sterile-my-little-pony-stat-strip-adhesive-bandages-3-4-x-3, design-series-planet-and-stars-adhesive-bandages-with-stat-strip-technology-x-3 |
| `needles-syringes` (`needles-syringes`) | `needles-syringes` | ✅ | `gid://shopify/Collection/474091225321` | 75 | tb-syringe-1ml-25g-x-5-8-det-needle-box-1180125058, spinal-needle-25g-x-3-1-2-high-flow-box-405138, r-needle-30g-x-1-2-box-nn3013r |
| `surgical-sutures` (`surgical-sutures`) | `surgical-sutures` | ✅ | `gid://shopify/Collection/474091258089` | 40 | unify-pga-surgical-sutures-size-5-0-18-thread-13mm-3-8-circle-r-c-needle-undyed-s-g518r13-u, unify-pga-surgical-sutures-size-4-0-30-thread-17mm-1-2-circle-taper-point-needle-undyed-m-g430t17-u, suture-removal-kit-sterile-50-cs |
| `testing` (`testing-screening`) | `testing-screening` | ✅ | `gid://shopify/Collection/474091290857` | 40 | urs-reader-and-starter-kit-4-prm395, urs-10-urine-reagent-strips-ua870, accutest-splitcup-5-panel-urine-drug-test-ds02ac625 |
| `exam-room` (`exam-room`) | `exam-room` | ✅ | `gid://shopify/Collection/474091323625` | 45 | sterile-alcohol-pad-2-ply-medium, phys-stool-w-bck-blk-bse-wwd-wedgewood, phys-stool-blk-bse-sgl-lever-wedgewood |
| `respiratory` (`respiratory`) | `respiratory` | ✅ | `gid://shopify/Collection/474091356393` | 40 | universal-suction-machine-tubing-and-filter-replacement-kit-with-canister-pack-of-1, trim-line-cpap-tube-6, trach-plug-jackson-6-1037836-john-bunn-1037836 |
| `mobility` (`mobility`) | `mobility` | ✅ | `gid://shopify/Collection/474091389161` | 40 | walkabout-alluralx-rollator-black-lumex, walkabout-alluralx-rollator-apple-red-lumex, walkabout-allura-rollator-black-lumex |
| `patient-therapy-rehab` (`patient-therapy-rehab`) | `patient-therapy-rehab` | ✅ | `gid://shopify/Collection/474091421929` | 40 | dynarex-actisplint-folded-flat-24-50-cs, back-support-universal-626-low-profile-sm-4x, armsling-xs |
| `surgery-procedure` (`trocars-trocar-kits`) | `trocars-trocar-kits` | ✅ | `gid://shopify/Collection/474091454697` | 40 | 4-5mm-premium-disposable-stainless-steel-trocar-wrap-kit-large-gloves-b9176c, 4-5mm-disposable-stainless-steel-trocar-wrap-kit-b9807, 4-5mm-disposable-stainless-steel-diamond-tip-trocar-tray-kit-medium-gloves-b1560 |
| `apparel` (`capes-gowns`) | `capes-gowns` | ✅ | `gid://shopify/Collection/474091487465` | 40 | surgical-gowns-reinforced-medium-20pouches-cs, protective-cover-gown-xl, protective-cover-gown-blue |
| `hygiene` (`hygiene`) | `hygiene` | ✅ | `gid://shopify/Collection/474091520233` | 87 | toothbrushes-soft-nylon-bristles-46-tuft-teal-10-144-cs, toothbrushes-30-tuft-adult-ivory-10-144-cs, toothbrush-white |
| `disinfectants` (`disinfectants`) | `disinfectants` | ✅ | `gid://shopify/Collection/474091553001` | 36 | surface-safe-2-step-applicator-kit-case-ken-ss33508, sterile-isopropyl-alcohol-wipers-tcbwalc30, soap-tincture-of-green-gal-4-c-grafco |
| `home-care` (`home-care`) | `home-care` | ✅ | `gid://shopify/Collection/474091585769` | 41 | reusable-eating-utensils-2354397, beveled-edge-floor-pad-lumex, bellavita-side-flap |
| `emergency-supplies` (`emergency-supplies`) | `emergency-supplies` | ✅ | `gid://shopify/Collection/474091618537` | 40 | kemp-usa-polyester-fabric-green-white-6-umbrella, kemp-usa-life-jackets-4-pack-in-carry-case-2-blue-2-red-adult, kemp-usa-life-jacket-red-black-adult |
| `incontinence` (`incontinence`) | `incontinence` | ✅ | `gid://shopify/Collection/474091651305` | 41 | washcloths-white-12-x-12-case-of-312-2375266, washcloth-8-x-12, pre-moistened-washcloths-8-x-10-scented |
| `iv-therapy` (`iv-therapy`) | `iv-therapy` | ✅ | `gid://shopify/Collection/474091684073` | 41 | iv-winged-catheter-24g-x-3-4-box-381512, iv-administration-set-83-tcbinfsp1, iv-administration-set-60-drop-83-1-needleless-port-1-inje-50-bx |
| `urology-ostomy` (`urology-ostomy`) | `urology-ostomy` | ✅ | `gid://shopify/Collection/474091716841` | 40 | urinary-leg-bags-med-600ml-sterile-4-12-cs, urinary-leg-bags-lg-1000ml-sterile-4-12-cs, urinary-drainage-bags-2000ml-sterile-20-cs |
| `sterilization` (`sterilization`) | `sterilization` | ✅ | `gid://shopify/Collection/474091749609` | 50 | qa-label-all-three, qa-label-rx-freeship, qa-label-backorder-freeship |
| `dental` (`dental`) | `dental` | ✅ | `gid://shopify/Collection/474091782377` | 40 | endodontic-irrigation-syringe-needle-luer-lock-27g-x-1-1-4-31-7mm-yellow-sterile-case-8881513850, endodontic-irrigation-syringe-needle-luer-lock-27g-x-1-1-4-31-7mm-yellow-sterile-box-8881513850, endodontic-irrigation-syringe-needle-luer-lock-23g-x-1-1-4-31-7mm-orange-sterile-case-8881513843 |
| `housekeeping-janitorial` (`housekeeping-janitorial`) | `housekeeping-janitorial` | ✅ | `gid://shopify/Collection/474091815145` | 47 | zip-bag-6-x-9-clear-zip69, zip-bag-4-x-6-clear-464m, zip-bag-4-x-4-clear-zip44 |
| `bariatric` (`bariatric`) | `bariatric` | ✅ | `gid://shopify/Collection/474091847913` | 41 | w-c-reclining-22w18d-dsk-elr-gendron-bariatric-700lbs-capacity, bariatric-hd-headboard-footboard-for-db600-cherry-1pc-cs, bariatric-hd-full-electric-homecare-bed-54-1pc-cs |
| `room-furniture` (`seating`) | `seating` | ✅ | `gid://shopify/Collection/474091913449` | 8 | phys-stool-w-bck-blk-bse-wwd-wedgewood, phys-stool-blk-bse-sgl-lever-wedgewood, phys-stool-blk-base-foot-ring-wedgewood |
| `face-masks` (`face-masks`) | `face-coverings` | ✅ | `gid://shopify/Collection/474091946217` | 1 | beard-covers |
| `pharmacy-products` (`pharmacy-products`) | `pharmacy-products` | ✅ | `gid://shopify/Collection/474091978985` | 49 | sunrise-phentermine-37-5mg-lue-speck-tab-civ-1000-ndc-11534-0160-03, style-ttt-laser-rx-label-8-5-x-14-w-blue-highlights-5771c-rx, somerset-cyanocobalamin-vitamin-b12-1000mcg-ml-injection-mdv-30ml-70069-0171-10 |

\* Route slug is the collection handle unless a `canonicalSlug` override exists in `lib/category-nav.ts` (only `face-masks` today).

## OCC

Canonical handle resolved by `getOccCollectionHandle()`: `occ`

| Live on QA? | GID | Product count | Sample products |
|---|---|---|---|
| ✅ | `gid://shopify/Collection/474143654121` | 130 | 14-drawstring-backpacks-assorted-neon-288-case-2269204, 15-character-backpacks-assorted-prints-24-case-2378131, 17-backpacks-with-elementary-school-kits-clear-24-packs-2365794 |

**Status**: resolves on the QA store as of this run (handle exists, see GID above). Production canonical confirmation is still pending Izzy (IZ-01 in docs/TASK-REGISTER-2026-08-03.md) — this only verifies the QA store, not production.

### OCC-adjacent collections (subcategory nav links, not registry-backed)

| Handle | Live on QA? | GID | Product count |
|---|---|---|---|
| `hygiene-kits` | ✅ | `gid://shopify/Collection/474140999913` | 0 |
| `school-supplies` | ✅ | `gid://shopify/Collection/474146406633` | 33 |
| `backpacks` | ✅ | `gid://shopify/Collection/474132938985` | 16 |

## Industries (tag-backed discovery)

| Slug | Tag | Products found on QA (capped at 5) | Sample products |
|---|---|---|---|
| `urgent-care` | `industry:urgent-care` | 5 | green-soap-1-gal-bottle-4-cs, metricide-28-qt-each-10-2805, machine-bag-5-x-5-16-500-cs, silicone-foley-catheters-2-way-standard-16-fr-30-cc-10-bx, 8-mil-black-medium-10-100-cs |
| `hrt-clinics` | `industry:hrt-surgery` | 5 | suture-removal-kit-sterile-50-cs, 3-2mmthree-piece-surgical-titanium-trocar-set-86035-dpti, 3-5mm-stainless-steel-trocar-tray-kit-with-antiseptic-large-gloves-b1352, 3-5mm-stainless-steel-trocar-2cm-tray-kit-with-antiseptic-medium-gloves-b1354, 3-5mm-premium-stainless-steel-trocar-pellet-insertion-wrap-kit-large-glove-b9175c |
| `home-health` | `industry:home-care` | 5 | after-shave-lotion-alcohol-free-4-oz-48-cs, calasoothe-skin-protectant-3-5-g-packet-2-144-cs, disposable-underpads-23-x-36-60g-3-50-cs, disposable-underpads-23-x-24-31-g-2-100-cs, baby-bath-16-oz |
| `clinics-doctors-offices` | `industry:clinic` | 5 | dappen-dishes-5-assorted-colors, bleach-germicidal-cleaner-32-oz-spray, cleansing-towelettes-5-x-7-10-100-cs, castile-soap-towelettes-5-x-7-10-100-cs, blu-tray-impression-trays-perforated-md-lower-4 |
| `pharmacies` | `industry:pharmacy` | 5 | printed-pill-envelope-1000-bx-grafco-3-5-x-2-5, clotrimazole-1-antifungal-cream-1oz-tubes-indv-boxed-72-cs, accutest-mononucleosis-rapid-test-id516, p-series-vials-11-dram-with-attached-cr-screw-caps-blue-rxpb11, pill-crusher-metal-grafco |

