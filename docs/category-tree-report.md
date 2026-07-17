# Category tree report

Generated 2026-07-17T02:20:27.271Z — 7386 products, 695 collections.

## Stale "Categories" collection check (ticket task)

- Junk collection `categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays` (title "Categories") live: true
- `frontpage` ("Home page") live: true
- The rebuilt app/categories page renders ONLY from lib/category-tree (tag backbone) — neither collection is a data source. The previously deployed page filtered the raw collection list, and the junk handle was already denied via lib/excluded-categories.ts.

## L1 reconciliation

- Discovered category: tags (excl. occ/pharmaceuticals): 25 (expect 26)
- Tags discovered but NOT configured: none
- Tags configured but NOT discovered: none
- Configured L1 collection handles missing live: none

## Sanity counts (ticket: Exam Room largest ~845, Dental ~149; catalog moves daily)

- apparel: 152
- bariatric: 258
- daily-living-aids: 1
- dental: 149
- disinfectants: 31
- emergency-supplies: 355
- exam-room: 845
- face-masks: 35
- gloves: 445
- home-care: 422
- housekeeping-janitorial: 85
- hygiene: 256
- incontinence: 114
- iv-therapy: 78
- mobility: 638
- needles-syringes: 592
- non-healthcare: 5
- non-medical: 76
- office-supplies: 18
- patient-therapy-rehab: 299
- pharmacy-products: 101
- respiratory: 407
- room-furniture: 512
- sterilization: 51
- surgery-procedure: 319
- surgical-sutures: 192
- testing: 173
- urology-ostomy: 52
- wound-care: 724

- out-of-tree (no category: tag): 1 (ticket expects ~68)

## Multi-category products (override table reconciliation)

- dynaride-transport-wheelchair-17-x-16-w-fixed-full-arm-silver-vein-1pc-cs: [home-care, mobility] — overridden
- iv-catheter-20g-x-2-box-sr-ox2051ca-3sr-ox2051ca: [iv-therapy, needles-syringes] — overridden
- surgical-aspirator-tips-1-4-green: [dental, respiratory] — overridden

## Boundary subcategories (22 with >1 parent; 3 hardcoded, rest dominant)

- 20g-iv-catheters: {"iv-therapy":1,"needles-syringes":10} → needles-syringes
- backpacks: {"non-medical":1,"office-supplies":2} → office-supplies
- barrier-sleeves: {"dental":13,"exam-room":22} → exam-room (x-link dental)
- bed-accessories: {"home-care":1,"room-furniture":13} → room-furniture
- bed-safety-rails: {"daily-living-aids":1,"home-care":1} → daily-living-aids
- blood-pressure-monitors: {"exam-room":10,"testing":5} → exam-room
- bvm-resuscitators: {"emergency-supplies":22,"respiratory":1} → emergency-supplies
- call-bells: {"exam-room":1,"home-care":1} → exam-room
- electrodes: {"patient-therapy-rehab":2,"surgery-procedure":1} → patient-therapy-rehab
- emesis-basin: {"home-care":2,"surgery-procedure":2} → home-care
- exam-tables: {"exam-room":16,"room-furniture":12} → room-furniture (x-link exam-room)
- eye-shields: {"exam-room":1,"surgery-procedure":5} → surgery-procedure
- foot-stools: {"exam-room":9,"home-care":1} → exam-room
- irrigation: {"dental":2,"exam-room":3} → exam-room
- leg-immobilizers: {"emergency-supplies":1,"patient-therapy-rehab":5} → patient-therapy-rehab
- measurement-devices: {"exam-room":4,"surgery-procedure":3} → exam-room
- patient-bibs: {"apparel":5,"exam-room":7,"hygiene":1} → exam-room
- perineal-wash: {"hygiene":7,"incontinence":4} → hygiene
- pet-pads: {"non-healthcare":2,"non-medical":2} → non-healthcare
- stools: {"exam-room":1,"room-furniture":5} → room-furniture
- suction-catheters: {"dental":1,"respiratory":15} → respiratory
- vital-sign-monitors: {"exam-room":6,"testing":12} → testing (x-link exam-room)

## Attribute-classified subcategory values (77; ticket expects ~80 — facets, never tiles)

- 0-sutures
- 1-0-sutures
- 1-gal-sharps
- 1-qt-sharps
- 10-0-sutures
- 10-panel
- 10cc-syringe
- 11-panel
- 12-panel
- 12cc-syringe
- 13-panel
- 14-panel
- 14g-hypodermic-needles
- 16-panel
- 16g-hypodermic-needles
- 18g-hypodermic-needles
- 18g-iv-catheters
- 18g-lancets
- 19g-hypodermic-needles
- 1cc-syringe
- 2-0-sutures
- 2-gal-sharps
- 20cc-syringe
- 20g-hypodermic-needles
- 20g-iv-catheters
- 21g-hypodermic-needles
- 21g-lancets
- 22g-hypodermic-needles
- 22g-iv-catheters
- 23g-dental-needles
- 23g-hypodermic-needles
- 24g-iv-catheters
- 25g-hypodermic-needles
- 25g-lancets
- 26g-hypodermic-needles
- 26g-lancets
- 27g-dental-needles
- 27g-hypodermic-needles
- 28g-hypodermic-needles
- 28g-lancets
- 3-0-sutures
- 30cc-syringe
- 30g-dental-needles
- 30g-hypodermic-needles
- 30g-lancets
- 35cc-syringe
- 3cc-syringe
- 4-0-sutures
- 5-0-sutures
- 5-panel
- 5-qt-sharps
- 50cc-syringe
- 5cc-syringe
- 6-0-sutures
- 6-panel
- 60cc-syringe
- 6cc-syringe
- 7-0-sutures
- 7-panel
- 8-0-sutures
- 8-gal-sharps
- 8-panel
- 9-0-sutures
- 9-panel
- astm-level-1-face-masks
- astm-level-2-face-masks
- astm-level-3-face-masks
- disposable-3-5mm
- disposable-4-5mm
- manual-wheelchairs-12
- manual-wheelchairs-14
- manual-wheelchairs-16
- manual-wheelchairs-18
- manual-wheelchairs-20
- manual-wheelchairs-22
- manual-wheelchairs-24
- manual-wheelchairs-26

## Flag (not built, per ticket implementation note)

- Compound-tag facets (e.g. "25G Hypodermic Needles") ride as-is; a clean single-"Gauge" abstraction needs a mapping pass — flagged, not launch-blocking.
