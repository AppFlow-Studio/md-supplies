# For Izzy — sign-off: DEV-BACKLINK-01 image exceptions, resolved

**Ticket:** `MDSUPPLIES · DEV-BACKLINK-01`



## What changed

QA-store matching was wrong on 5 of the original 8 "needs review" rows. Re-running against production
(Shopify Admin API, read-only, 10,328 products) found:

**3 recovered as 301 redirects**, straight to a live CDN image (not a `/product/` page — matches the
one existing confident recovery and avoids Google reading an image→page redirect as a soft 404):

| Legacy URL | Anchor | Now redirects to |
| --- | --- | --- |
| `.../15ULWMDK6A.gif` | Safety goggles with side shields | Dynarex Protective Eye Goggles, 1pc/bag, 50/cs (2297) |
| `.../PREGWANPVK.gif` | Sterile disposable scalpels | MedPride Disposable Scalpels, #11 (MPR-47111) |
| `.../XYZPG89DSJ.gif` | USCG type 2 life jacket | Kemp USA Type II Adult Life Jacket (20-001-ADULT) |

**One of these needs your explicit attention:** the life jacket. The QA-store candidate
(`kemp-usa-life-jacket-red-black-adult`) is SKU family **20-002**, which is **not** Type II — only
family **20-001** carries that claim, and does so in its own title. If this had shipped on the QA
finding, we'd have attached a USCG Type-II compliance claim to the wrong product. It's now pointed at
the correct family, but flagging it specifically since it's exactly the kind of call the ticket asks
to route to you rather than assume.

**5 confirmed correctly dead (410)** — no change in outcome, just now verified against production
instead of QA:

| Legacy URL | Anchor | Why it stays dead |
| --- | --- | --- |
| `.../FF2KL9HABG.gif` | MedPride Hydrogel Wound Dressing 4x4 | Exact product is live but has zero images (its other sizes do) |
| `.../MXCUT572QP.gif` | Synthetic vinyl gloves | Matching products are live but have zero images; the only imaged vinyl glove is a different product |
| `.../53DADEVYIN.gif` | PVC commode chair | Only live PVC product is a pail, not a chair — no identity match |
| `.../979PEK3F66.gif` | Trotter pediatric mobility chair | Trotter line is live only as accessories; the base chair isn't in the catalog |
| `.../RQZYQP73KJ.gif` | Pharmaceutical spatula | No matching live product |

The original 9 already-410 targets (Dynarex tattoo needle codes, a Vision Labs form, a Hospira IV bag,
an Rx Destroyer unit, the free-shipping badge) were also re-checked and confirmed correct — no change.

## One thing worth raising separately, not part of this ticket

Two of the "stays dead" outcomes above are dead **only** because the matching live product has zero
images: `Sterile Hydrogel Burn Dressing` (7007102) and the MedPlus vinyl glove records are active and
published with no product photography. That's a catalog data gap independent of this SEO ticket — happy
to file it separately if useful.

## Not yet covered

- Workstream E (host/protocol variants) is still unevidenced.
- The 3 new redirect targets are confirmed to exist on the CDN (Admin API), but I haven't separately
  re-verified they resolve correctly through the live storefront proxy post-deploy.

## What I need from you

Sign-off on the life-jacket SKU-family call specifically, and a general go/no-go on treating all 8 as
resolved. Full detail and reasoning per row: `EXCEPTIONS.md` in this folder. Source data:
`production-recheck-2026-09-07.md` (attached separately).
