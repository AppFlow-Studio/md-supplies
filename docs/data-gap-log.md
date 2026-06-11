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