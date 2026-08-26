# Nav Reconciliation Table — 2026-08-25

**Source:** `scripts/audit-category-tree.ts`, run against the QA store (this dev
environment's only reachable Storefront token). Re-run against production (or hand
this script to Izzy) before treating any row below as production-confirmed —
see this plan's Global Constraints.

Generated: 2026-08-25T07:28:21.746Z · Total products scanned (QA store): 1,111
(production has ~7,000+ — see Global Constraints; do not extrapolate QA-store
zero-counts or child lists to production without Izzy's confirmation).

## Frontend category → Shopify collection reconciliation

| Frontend Category | Route | Configured Shopify Handle | Live Collection Exists? | Parent | Children (top 4) | Status |
|---|---|---|---|---|---|---|
| Gloves | /category/gloves | gloves | YES | — | exam-gloves, industrial-gloves, general-purpose-gloves, surgical-gloves | OK |
| Wound Care | /category/wound-care | wound-care | YES | — | fabric-adhesive-bandages, adhesive-bandages, surgical-tape, abd-rolls | OK |
| Needles & Syringes | /category/needles-syringes | needles-syringes | YES | — | syringe-with-needle, 1-qt-sharps, blunt-cannulas, needles | OK |
| Surgical Sutures | /category/surgical-sutures | surgical-sutures | YES | — | skin-markers, suture-removal | OK |
| Testing | /category/testing-screening | testing-screening | YES | — | 12-panel, 6-panel, 5-panel, gastrointestinal-test | OK |
| Exam Room | /category/exam-room | exam-room | YES | — | alcohol-prep-pads, alcohol-swabsticks, foot-stools, blood-pressure-monitors | OK |
| Respiratory | /category/respiratory | respiratory | YES | — | cpap-masks, oxygen-cylinder-carts, nebulizers, suction-canisters | OK |
| Mobility | /category/mobility | mobility | YES | — | offset-handle-canes, standard-crutches, 3-wheeled-rollators, rollators | OK |
| Patient Therapy & Rehab | /category/patient-therapy-rehab | patient-therapy-rehab | YES | — | abdominal-binders, ankle-brace, cervical-neck-collars, arm-slings | OK |
| Surgery & Procedure | /category/surgery-procedure | surgery-procedure | YES | — | trocars, disposable-3-5mm, drapes, disposable-4-5mm | OK |
| Apparel | /category/capes-gowns | capes-gowns | YES | — | isolation-gowns, exam-gowns, exam-capes, patient-gowns | OK |
| Hygiene | /category/hygiene | hygiene | YES | — | toothbrushes, hair-combs, soap-refills, hair-care | OK |
| Disinfectants | /category/disinfectants | disinfectants | YES | — | disinfecting-wipes, hand-sanitizers, disinfectants, surface-wipes | OK |
| Home Care | /category/home-care | home-care | YES | — | bath-bench, bath-safety-rails, bed-pans, bath-lift-accessories | OK |
| Emergency Supplies | /category/emergency-supplies | emergency-supplies | YES | — | cpr-masks, lifeguard-umbrella, bvm-resuscitators, emergency-blankets | OK |
| Incontinence | /category/incontinence | incontinence | YES | — | underpads, baby-wet-wipes, skin-protectants, washcloths | OK |
| IV Therapy | /category/iv-therapy | iv-therapy | YES | — | iv-administration-sets, iv-poles, iv-solutions, iv-securement-dressings | OK |
| Urology & Ostomy | /category/urology-ostomy | urology-ostomy | YES | — | foley-catheters, drainage-bags, gastrostomy-tubes, intermittent-catheters | OK |
| Sterilization | /category/sterilization | sterilization | YES | — | sterilization-pouches, csr-wraps, autoclave-machine | OK |
| Dental | /category/dental | dental | YES | — | dental-bibs, air-water-syringe-tips, lower, upper | OK |
| Housekeeping & Janitorial | /category/housekeeping-janitorial | housekeeping-janitorial | YES | — | reclosable-bags, bed-sheets, patient-belonging-bags, fluid-solidifier | OK |
| Bariatric | /category/bariatric | bariatric | YES | — | bariatric-wheelchair-cushions, bariatric-patient-lift-slings, bariatric-commode-chairs, bariatric-foot-stools | OK |
| Room Furniture | /category/seating | seating | YES | — | _none_ | OK |
| Face Masks | /category/face-masks | face-coverings | YES | — | _none_ | OK |
| Pharmacy Products | /category/pharmacy-products | pharmacy-products | YES | — | pharmacy-products, vials, medication-management, pharmacy-labels | OK |

### Findings

All 25 `CATEGORY_TREE_L1` rows resolved to a live QA-store collection handle
(`Live Collection Exists? = YES`, `Status = OK`). **No `NO — MISSING` or
`FLAG` rows were found in this QA-store run.** Per the ticket's guardrails,
had any surfaced, this document would list them here for Izzy/Sardor to
resolve together rather than the registry being changed unilaterally — that
branch of the process was not needed this run, but remains the process for
any row that flips to MISSING/FLAG on a production or later QA re-run.

This is a QA-store-only result (~1,100 products). It does **not** by itself
confirm the same 25 handles exist in production (~7,000+ products) — re-run
`NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-category-tree.ts`
against production credentials, or hand the script to Izzy, before treating
this table as production-confirmed.

## Department audit notes

Audited all 25 `CATEGORY_TREE_L1` departments (not just Mobility, which Task
5 already covered) using the reconciliation table above plus a manual
browser pass against the running dev server (`npm run dev`, QA store data).

- **Route resolution:** All 25 category tiles link to a route that resolves
  (HTTP < 400, no not-found H1). This corroborates the existing automated
  coverage in `e2e/categories-hub-integration.spec.ts` ("every card links to
  a route that actually renders"), which already asserts this for all 25
  `/categories` hub cards on every run.
- **Truncation-risk labels (Housekeeping & Janitorial, Patient Therapy &
  Rehab):** Checked both in the desktop mega-dropdown (1440x900) and as
  direct category-page H1s/breadcrumbs. Neither truncates — both wrap or
  render on one line cleanly at the panel's current 800px width. No overflow
  or mid-word clipping observed.
- **Header mega-dropdown — known cosmetic unevenness (Task 5, ruled
  acceptable-to-ship):** Confirmed directly in this pass. In the "More
  Categories" column at 1440x900, "Bariatric" (3 tag-derived children) sits
  in the same grid row as "Room Furniture" (0 children — its Featured/tag
  child list is empty), and further down "Face Masks" (0 children) sits
  beside "Pharmacy Products" (3 children). This produces visibly uneven row
  heights in that column, exactly the outcome the grid-cell-balancing hack
  removal in Task 5 was expected to allow (see `Header.tsx`'s comments on
  `MAX_DROPDOWN_CHILDREN` / the removed `col-start-1` hack). Nothing
  overlaps, clips, or breaks — the panel's `max-h-[80vh] overflow-y-auto`
  fallback confirmed working (verified by scrolling the open panel to reach
  "Browse all categories →" at the bottom). Per the explicit prior ruling,
  this is **not** being redesigned as part of this task; it is surfaced here
  again for client/Izzy sign-off via these QA notes, as instructed.
- **Zero-product-count departments (QA store):** `Room Furniture`
  (`/category/seating`, 0 products) and `Face Masks` (`/category/face-masks`,
  0 products) both render their normal category-page shell with a graceful
  "No products found" / "Try adjusting or clearing your filters" state — no
  404, no broken layout, no invented product data. Per the plan's guardrails,
  this is **not** treated as an automatic defect: it needs confirmation from
  Izzy on whether it's QA-store sparsity (most likely, given QA carries only
  ~1,100 of production's ~7,000+ products) or a genuine production gap.
  Flagging both for that confirmation, not fixing anything here.
- **Desktop hover / mobile tap mechanism:** Desktop hover-to-open and
  focus-within keyboard behavior on the "Catalog" (Categories) trigger
  verified working during this pass (mega-dropdown opens on hover, scrolls
  internally, closes on mouse-leave/Escape per the existing Task 5
  mechanism). Mobile tap-to-expand behavior is exercised by the new e2e
  regression coverage below (`mobile-chromium` Playwright project); this
  manual pass could not get a true narrow-viewport render locally (browser
  window resize was not honored by the automation tool in this environment)
  and relies on the e2e suite's real mobile viewport emulation instead.

## Screenshots (evidence, not committed to the repo)

Captured during this manual pass (local temp paths — not part of the git
diff for this task):
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787642969257-8.jpg` — desktop mega-dropdown open, top of panel
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787642987612-10.jpg` — desktop mega-dropdown scrolled, showing the Bariatric/Room Furniture and Face Masks/Pharmacy Products unevenness plus "Browse all categories →"
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787643006363-11.jpg` — `/category/seating` (Room Furniture), 0 products, graceful empty state
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787643006363-12.jpg` — `/category/face-masks`, 0 products, graceful empty state
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787643047591-15.jpg` — `/category/housekeeping-janitorial`, no truncation
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787643047596-16.jpg` — `/category/patient-therapy-rehab`, no truncation
- `C:\Users\User\AppData\Local\Temp\claude-chrome-screenshots-f99xPw\screenshot-1787643060756-17.jpg` — `/category/mobility/rollators`, subcategory route resolves
