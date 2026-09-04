# Exceptions handoff — Izzy SEO review

P0 SEO migration integrity follow-up to T4 · Redirects & Broken Backlinks.
These targets have no confident, verified semantic replacement. Per the
ticket's instruction ("If a destination is technically valid but semantically
questionable, mark it Needs Izzy SEO review instead of improvising"), none of
these were guessed at in code — they are left exactly as they behave today
(pass-through → eventual 404) pending a human call.

All of these were checked against the **QA** Shopify store (`SHOPIFY_STORE_DOMAIN`
in `.env`), via `scripts/seo-migration/match-images.mts`, not production — re-run
against the production Storefront API before treating any "no match" below as
final. Full search hits are in `image-search-results.json` in this folder.

## Needs Izzy SEO review (plausible candidate, not implemented)

| Legacy URL | Anchor context | Candidate | Why uncertain |
|---|---|---|---|
| `/sup/images/productImages/15ULWMDK6A.gif` | "Safety goggles with side shields" | none found | Search returns bathtub safety rails, not eyewear — either no eye-protection line is stocked, or the search terms need refinement against production data. |
| `/sup/images/productImages/53DADEVYIN.gif` | "PVC commode chair" | `/product/bariatric-drop-arm-bedside-commode-chair` (Drive Medical) | Material mismatch (PVC vs. bariatric/aluminum) — plausible family match, not a verified identity match. |
| `/sup/images/productImages/979PEK3F66.gif` | "Trotter pediatric mobility chair" | none found | Catalog has adult commode/transport chairs only; no pediatric-specific line found. |
| `/sup/images/productImages/FF2KL9HABG.gif` | "MedPride Hydrogel Wound Dressing Sheet 4x4" | none found | Search returns Shield Line adhesive bandages, not hydrogel dressings or the MedPride vendor. Needs a direct catalog check for MedPride hydrogel SKUs. |
| `/sup/images/productImages/MXCUT572QP.gif` | "Synthetic vinyl gloves" | none found | Catalog carries nitrile/latex gloves; no vinyl-specific SKU surfaced. |
| `/sup/images/productImages/PREGWANPVK.gif` | "Sterile disposable scalpels" | unverified | Top hit's handle (`qa-min-order-700`) looks like a synthetic QA-store fixture product, not a real catalog SKU — cannot be trusted from this environment. |
| `/sup/images/productImages/RQZYQP73KJ.gif` | "Pharmaceutical spatula" | none found | Search returns sterilization pouches and a foot stool — no relevant hit. |
| `/sup/images/productImages/XYZPG89DSJ.gif` | "USCG type 2 life jacket" | `/product/kemp-usa-life-jacket-red-black-adult` (Kemp USA) | Plausible title match, but USCG Type-II approval is a compliance-sensitive claim — should be confirmed by a human before redirecting under it, not assumed from a text search. |

## Intentional no-recovery — spam/off-topic source (not a semantic question, no action needed)

These have no product-identifying signal at all, or the anchor text is
off-topic for a medical supplies site. Per "Out of scope," they are **not**
given an invented redirect purely to preserve link equity.

| Legacy URL | Anchor context | Referring domain |
|---|---|---|
| `/sup/images/IIUR93PAQ6.gif` | "Drive medical supplies cheap" | negroidhaven.com (parked/spam, query-only URL) |
| `/sup/images/JD8EJSY7CV.gif` | "Dme supplies discount" | journeyintoindia.com (DR 0, query-only URL) |
| `/sup/images/productImages/5K5N96KZBM.gif` | "Ladies chef on sale pants" | spider-skills.com — off-topic (apparel) |
| `/sup/images/productImages/XMP2E37F1N.gif` | "Tailored chef pants" | seaborne-gz.com — off-topic (apparel) |

## Page-level exceptions

None. Every unique page-type target from both exports (26 from the 2026-04-26
broken-backlinks file, 3 non-image from the 2026-09-01 file) resolves
deterministically to a 301 or 410 — see `unified-inventory.md`. The one new
row from the September export not already covered by T4 (`MediClear-SGS
Chocolate`, Thorne Research) got a 410 on the same basis as the two existing
Thorne VeganPro 410s: the vendor is confirmed absent from the live catalog.

## Not exceptions, but worth flagging to Izzy

- **9 of 22 historic image targets got a 410** (Dynarex tattoo needle codes ×5,
  a Vision Labs requisition form, a Hospira Lactated Ringers IV bag, an Rx
  Destroyer unit, and the free-shipping badge). All were search-checked
  against the QA catalog with no match. If any of these product lines are
  still sold under a different name, a 301 is a five-minute fix once Izzy
  confirms.
- Only **one** image target (`3Y3PKD2E6Q.gif`, Alcohol Prep Pad) got a
  confident Case-2 recovery — redirected straight to the live Dukal CDN image.
  It was picked as the single unambiguous, low-compliance-risk commodity
  match; the other 9 candidates above were judged too identity-uncertain (or,
  for the life jacket, too compliance-sensitive) to guess at.
