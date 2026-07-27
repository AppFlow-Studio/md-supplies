# Daily Data-Gap Flag Log

Devs append a row whenever a rendered item is missing any required field.
Format: `YYYY-MM-DD | page/component | missing field(s) | action needed`

## Fields that trigger a flag
- product handle (404 on PDP)
- selected-variant price (shows $0 or NaN)
- product image (broken img or placeholder)
- brand/vendor name
- packaging / units info
- return policy text
- shipping badge / lead time
- SEO title or meta description
- category mapping (product renders in wrong or no category)
- partner mapping (vendor not in PARTNERS list)
- industry mapping (collection handle missing in Shopify)

---

## Log

| Date | Page | Component | Missing Field | Action Needed | Resolved |
|------|------|-----------|--------------|---------------|----------|
| 2026-06-11 | /solutions/occ | OCCHubPage | eligibleProducts live prices | Verify Shopify handles in lib/occ.ts | |

## OCC eligible-product handle verification (DEV-21/E8 §9.1)

**Updated 2026-07-27 — the fetch strategy changed since this was last verified.**
The OCC page no longer resolves products per-handle with a static fallback. It
now queries a Shopify **collection** at request time
(`fetchOCCProducts()` in `app/solutions/occ/page.tsx`), trying each handle in
`OCC_COLLECTION_HANDLES` (`['occ', 'operation-christmas-child', 'occ-supplies']`)
in order, then falling back to a `tag:occ` product query if none of those
collections return results. `lib/occ.ts`'s static `eligibleProducts` (handles
like `occ-hygiene-kit`) are no longer read by the page — they're unused sample
data now.

If none of the collection handles nor the `occ` tag resolve in Shopify, the
"Featured OCC Shoebox Supplies" section renders nothing (no fallback images
shown).

Open item — confirm with Izzy / Shopify Admin → Collections:

- [ ] One of `occ` / `operation-christmas-child` / `occ-supplies` exists as a
      collection with the intended eligible products, **or** products are
      tagged `occ` so the tag-based fallback picks them up.
- [ ] Once confirmed, verify the OCC page in staging shows live prices/images
      (not an empty products section).

If the actual collection handle differs from all three guesses, update
`OCC_COLLECTION_HANDLES` in `app/solutions/occ/page.tsx`.