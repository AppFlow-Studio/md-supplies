# Exceptions handoff — Izzy SEO review

P0 SEO migration integrity follow-up to T4 · Redirects & Broken Backlinks.

**Update, 2026-09-07 — resolved against production.** The 8 rows below were
originally matched against the QA store only. A production re-check (Shopify
Admin API, `daebb2-76.myshopify.com`, see
`../../../data/seo-backlinks-01/catalog-live-2026-09-07.json` and the
production-recheck report) found QA-store matching was **wrong on 5 of 8**.
All 8 are now resolved and implemented in `proxy.ts`:

- **3 recovered as 301s** to a live CDN image (not a `/product/` page, per the
  ticket's own pattern for `3Y3PKD2E6Q.gif`): the goggles, the scalpels, and
  the life jacket — the last of these to the *correct* Type II SKU family
  (`20-001`), not the QA candidate's `20-002` family, which was not Type II.
- **5 confirmed dead (410)**: the commode chair, the Trotter chair, the
  hydrogel dressing, the vinyl gloves, and the spatula — see the table below
  for why each stays dead even though some have a same-name live product.

Storefront-side resolution of the 3 new redirects has not been separately
re-verified post-deploy — only that the CDN image exists per the Admin API.

## Needs Izzy SEO review (plausible candidate, not implemented) — RESOLVED, see update above

| Legacy URL | Anchor context | Candidate | Why uncertain (original QA-only finding) | Resolution (production) |
|---|---|---|---|---|
| `/sup/images/productImages/15ULWMDK6A.gif` | "Safety goggles with side shields" | none found | Search returns bathtub safety rails, not eyewear. | **301** → Dynarex Protective Eye Goggles (2297), a product-type match; no live title says "side shields". |
| `/sup/images/productImages/53DADEVYIN.gif` | "PVC commode chair" | `/product/bariatric-drop-arm-bedside-commode-chair` (Drive Medical) | Material mismatch — plausible family match, not verified identity. | **410 stands** — the only PVC product is a commode pail (89001), not a chair. No identity match. |
| `/sup/images/productImages/979PEK3F66.gif` | "Trotter pediatric mobility chair" | none found | Catalog has adult commode/transport chairs only. | **410 stands** — Trotter line is live but only as 6 accessories; the base chair isn't in the catalog. |
| `/sup/images/productImages/FF2KL9HABG.gif` | "MedPride Hydrogel Wound Dressing Sheet 4x4" | none found | Search returns Shield Line adhesive bandages, not hydrogel dressings. | **410 stands** — exact product is live (`sterile-hydrogel-burn-dressing-4-x-4`) but has zero images; its 2"x6"/16"x24" siblings do. |
| `/sup/images/productImages/MXCUT572QP.gif` | "Synthetic vinyl gloves" | none found | Catalog carries nitrile/latex gloves; no vinyl-specific SKU surfaced. | **410 stands** — matching MedPlus vinyl gloves are live but have zero images; the only imaged vinyl glove is a different product (First Glove). |
| `/sup/images/productImages/PREGWANPVK.gif` | "Sterile disposable scalpels" | unverified | Top hit's handle looked like a synthetic QA-store fixture. | **301** → MedPride Disposable Scalpels #11 (MPR-47111) — exact brand/product match against 10 live sterile scalpels. |
| `/sup/images/productImages/RQZYQP73KJ.gif` | "Pharmaceutical spatula" | none found | Search returns sterilization pouches and a foot stool. | **410 stands** — only live "spatula" hits are a counting-tray/spatula combo and an unrelated suture needle shape. |
| `/sup/images/productImages/XYZPG89DSJ.gif` | "USCG type 2 life jacket" | `/product/kemp-usa-life-jacket-red-black-adult` (Kemp USA) | Plausible title match, but Type-II approval is compliance-sensitive. | **301**, but **not** to the QA candidate — that SKU is family `20-002`, not Type II. Redirected to family `20-001`, which is Type II and says so in its own title. |

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

- **14 of 22 historic image targets are 410** (the original 9 — Dynarex tattoo
  needle codes ×5, a Vision Labs requisition form, a Hospira Lactated Ringers
  IV bag, an Rx Destroyer unit, and the free-shipping badge — plus the 5 from
  this update: the PVC commode chair, Trotter pediatric chair, hydrogel
  dressing, vinyl gloves, and pharmaceutical spatula). The original 9 were
  re-confirmed correct against production in the 2026-09-07 recheck.
- **4 image targets got a confident recovery**: the original Case-2 match
  (`3Y3PKD2E6Q.gif`, Alcohol Prep Pad) plus 3 more found in the 2026-09-07
  production recheck (goggles, scalpels, life jacket) — all redirected
  straight to a live CDN image, not a `/product/` page.
- Two catalog defects surfaced during the production recheck, unrelated to
  this ticket: `Sterile Hydrogel Burn Dressing` (7007102) and the MedPlus
  vinyl glove records are active/published with zero images. Worth raising
  separately — it's the only reason those two stay dead here.
- Workstream E (host/protocol variants) is still unevidenced as of the
  2026-09-07 recheck.
