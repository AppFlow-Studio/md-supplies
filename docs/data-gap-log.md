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

The OCC page already resolves **live** prices/images at request time via
`fetchLiveProducts()` (`app/solutions/occ/page.tsx`), falling back to the static
values in `lib/occ.ts` when a handle does not resolve. The remaining open item is
to confirm each handle below exists in Shopify so the live path (not the
fallback) is used in production. Until verified, prices/images shown are the
`lib/occ.ts` fallbacks (images are `placehold.co` placeholders).

Verify in Shopify admin (Products → search handle) and tick when the live
product resolves with a real price + image:

- [ ] `nitrile-exam-gloves-powder-free`
- [ ] `latex-exam-gloves-powder-free`
- [ ] `disposable-bed-pads`
- [ ] `nasal-cannula-adult`
- [ ] `simple-face-mask`
- [ ] `standard-walker`

For any handle that does not resolve, update it to the correct Shopify handle in
`lib/occ.ts` (or remove the product), then re-check on staging.