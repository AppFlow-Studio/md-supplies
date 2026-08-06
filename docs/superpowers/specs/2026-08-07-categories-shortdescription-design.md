# DEV-LAUNCH-03: Categories hub short descriptions

**Date:** 2026-08-07
**Ticket:** DEV-LAUNCH-03 (Final Launch Configuration & Implementation Plan) — P0 launch gate

## Problem

`app/categories/page.tsx` renders a category card description only when the
live Shopify collection `description` is nonempty (`col?.description && ...`).
Several of the 25 launch categories have blank Shopify descriptions, so their
cards render with no description text, which looks unfinished.

## Decision

Add a required `shortDescription: string` field to `L1CategoryDef` in
`lib/category-tree.ts`, populated with the 25 approved verbatim descriptions
from the ticket's Appendix A, keyed by the registry's canonical `tag` (not by
Shopify `collectionHandle`).

- **Testing category resolution:** registry `tag` is `testing`;
  `collectionHandle` (routing/Shopify lookup) is `testing-screening`. The new
  field is keyed by `tag`, so `testing` gets the "Testing" hub card copy.
- `buildL1Tiles()` already spreads `L1CategoryDef` into `L1Tile`, so
  `tile.shortDescription` is available with no further plumbing.
- `app/categories/page.tsx`'s "Browse All Categories" grid switches from
  `col?.description &&` to unconditionally rendering `tile.shortDescription`.
  The Shopify collection lookup (`col`) is no longer used for hub card
  descriptions; it may still be used elsewhere in the file (e.g. the Popular
  Categories strip's title).
- No new component or separate description file: the registry remains the
  single canonical source, consistent with the ticket's "resolve centrally"
  requirement.

## Alternatives rejected

- A separate `lib/category-descriptions.ts` map keyed by slug: adds
  indirection with no benefit, since the ticket explicitly permits extending
  the registry directly.
- A JSON/CMS-style content file: no localization or non-developer editing
  requirement exists today; unnecessary complexity.

## Testing

Extend `lib/__tests__/category-tree.test.ts` with an assertion that every
entry in `CATEGORY_TREE_L1` has a nonempty `shortDescription`, matching this
repo's existing convention of unit-testing registry data as plain functions
rather than rendering the async Server Component page. This test fails if a
category is ever added to the registry without launch copy.

## Out of scope

- Card visual/height treatment beyond what's needed to keep descriptions
  readable without hiding titles (existing `line-clamp-2` styling stays;
  adjust only if visual QA at 390/768/1024/1440 widths shows a problem).
- DEV-LAUNCH-04 (category images) and DEV-LAUNCH-05 (hub presentation) —
  same card markup, sequenced separately per ticket dependencies.

## Appendix A — Approved Launch Copy (source of truth)

This is the verbatim client-approved copy from the DEV-LAUNCH-03 ticket
(2026-08-05), transcribed here as the durable source of truth that
`lib/category-tree.ts` and `lib/__tests__/category-tree.test.ts` must both
match.

| Registry tag | Approved description |
|---|---|
| gloves | Exam and procedure gloves in nitrile, latex, and vinyl options for clinical, laboratory, and facility use. |
| wound-care | Dressings, gauze, bandages, tapes, irrigation supplies, and other essentials for routine wound care. |
| needles-syringes | Needles, syringes, and injection accessories in a range of gauges, sizes, and safety configurations. |
| surgical-sutures | Absorbable and non-absorbable sutures, needles, and wound-closure supplies for clinical procedures. |
| testing | Diagnostic, screening, specimen-collection, and point-of-care testing supplies for healthcare settings. |
| exam-room | Everyday exam-room equipment and supplies, including tables, stools, lighting, and patient-care essentials. |
| respiratory | Respiratory-care supplies for oxygen delivery, nebulization, airway support, and routine patient treatment. |
| mobility | Wheelchairs, walkers, canes, rollators, and mobility accessories for patient support and daily movement. |
| patient-therapy-rehab | Therapy, rehabilitation, exercise, and positioning products that support recovery and patient mobility. |
| surgery-procedure | Procedure-room instruments, kits, trays, and accessories for minor surgery and clinical procedures. |
| apparel | Medical apparel, gowns, caps, footwear, scrubs, and protective clothing for healthcare teams and patients. |
| hygiene | Personal-hygiene and patient-care products for bathing, oral care, grooming, and everyday cleanliness. |
| disinfectants | Cleaning and disinfection products for surfaces, equipment, hands, and infection-control routines. |
| home-care | Practical medical and personal-care supplies designed for patients, caregivers, and home-health use. |
| emergency-supplies | First-aid, trauma, rescue, and emergency-response supplies for clinics, facilities, and mobile teams. |
| incontinence | Briefs, underpads, liners, wipes, and related products for dependable incontinence and skin care. |
| iv-therapy | IV administration, infusion, access, and securement supplies for clinical fluid and medication delivery. |
| urology-ostomy | Catheters, drainage, ostomy, and related accessories for urological and ostomy care. |
| sterilization | Sterilization pouches, wraps, indicators, cleaners, and accessories for instrument-processing workflows. |
| dental | Dental procedure, examination, infection-control, and patient-care supplies for dental practices. |
| housekeeping-janitorial | Facility-cleaning, waste-handling, paper, and janitorial supplies for healthcare environments. |
| bariatric | Bariatric patient-care and mobility equipment designed for higher weight capacities and added support. |
| room-furniture | Seating, exam tables, cabinets, and room furnishings for treatment, consultation, and patient-care spaces. |
| face-masks | Procedure masks, respirators, and face coverings for clinical, facility, and everyday protective use. |
| pharmacy-products | Dispensing, labeling, packaging, counting, and patient-use supplies for pharmacy operations. |

This table was diffed byte-for-byte against both `lib/category-tree.ts`'s
`CATEGORY_TREE_L1` and `lib/__tests__/category-tree.test.ts`'s
`APPROVED_SHORT_DESCRIPTIONS` during the DEV-LAUNCH-03 final review
(2026-08-07) with zero mismatches found.
