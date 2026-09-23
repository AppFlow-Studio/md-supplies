# Sardor — status report: MD Supplies client meeting follow-ups

**From:** Sardor (dev) · **Date:** 2026-09-17


## Summary

Items 3 and 4 were genuine frontend gaps and are fixed below. Items 1 and 2
turned out to already be implemented — verified by reading the code, not
assumed — and are blocked only on Izzy's Shopify-side data population. Item 5
is a documentation deliverable that already exists and matches the live code
contract. Item 6 surfaced a concrete, likely-correct lead (a live redirect)
but needs Izzy's Shopify Admin access to confirm before any frontend change.
Item 7 (regression) ran clean at the automated-test level; a live
click-through pass still needs to happen once Izzy's data lands.

## 1. Variant-specific descriptions — frontend done, blocked on data

Already dynamic, no code change needed. `custom.variant_description` (rich
text) is fetched per-variant, flattened via `shopifyRichTextToPlainParagraphs`,
and re-derived from `selectedVariant` on every render in
`components/product/ProductView.tsx` — plain React state, not memoized
incorrectly, so switching A → B → C → A can never show stale data.

It renders as a "Variant Details" supplement under the full product
description rather than replacing it. Per Izzy's `variant-field-mapping-
2026-09-16.md` (in Downloads): a blank `variant_description` means "identical
to the parent description," not "missing data" — Izzy's note says explicitly
to keep this behavior as-is.

**Remaining work (Izzy):** populate the metafield from archived originals
across the full consolidated-product set — only AeroWalk was piloted so far.

## 2. Variant quantity / packs-per-case — frontend done, blocked on data

Also already variant-aware, using exactly the fields in Izzy's field map:

- `total_order_quantity`, `inner_pack_quantity`, `packs_per_case` — variant
  only, no product-level fallback.
- `order_size`, `units_per_order` — variant first, falling back to the
  product-level value only when no sibling variant disagrees with it.

Both the above-the-fold UNIT/QUANTITY block and the Order Packaging tab read
the same resolved values (`resolveVariantValue`), so they cannot show
mismatched numbers for the same selection.

**Remaining work (Izzy):** backfill real per-variant packaging values where
they currently differ from the product-level default.

## 3. Backorder wording — done

`lib/labels/labels.ts` produced `"Backorder, ships {date}"`. Changed to
`"Backorder, ETA {date}"`. This is the single label-text source every surface
(PDP, cards, Quick Add, cart) renders from, so the wording is fixed
everywhere in one place. Variant-specific backorder gating (one variant
backordered, a sibling available) is untouched.

Updated 6 test assertions across `lib/labels/__tests__/labels.test.ts`,
`components/product/__tests__/ProductView.a11y.test.tsx`, and
`components/product/__tests__/QuickAddContent.test.tsx` that pinned the old
string; added a regression test asserting `"ships <date>"` never appears.
Regression-tested switching between available and backordered variants —
still correct.

## 4. SKU label — done

"Internal SKU" → "MDSupplies SKU" on the PDP Specifications tab
(`components/product/ProductView.tsx`). Label copy only — the underlying
source (native variant `sku`) is unchanged, and it still switches correctly
on variant selection.

Updated 3 tests referencing the old heading text: `__tests__/pdp-semantic-
markup.test.ts`, `components/product/__tests__/ProductView.test.tsx`,
`components/product/__tests__/ProductView.a11y.test.tsx`.

## 5. Shopify field map — ready to use

Izzy's `variant-field-mapping-2026-09-16.md` already matches the live code
contract field-for-field (verified against `lib/shopify/queries/products.ts`
and `lib/shopify/normalize.ts`). Ready to hand to Juliette for the training
video.

Worth flagging for that video: three fields are decoys and should stay out of
her workflow —

- `custom.unit_size` (variant) — holds 0 values.
- `custom.quantity_of_units` (product) — holds 1 value across the catalog,
  and isn't even queried by the frontend today (`ProductView.tsx`'s fallback
  reference to it is dead code — harmless, but not a real data path).
- `custom.backorder_restock_eta` (product, text) — drives the old Liquid
  theme only. The headless site's ETA field is
  `custom.estimated_back_order_restock_date`; the two sets of values are
  close to disjoint.

## 6. HB01/HB02 hairbrush — found a concrete lead, needs Izzy

`docs/redirects-ready.json` carries a live 301:

```
/products/hair-brush-ivory-hb01  →  /products/hair-brush-gray-hb02
```

This is very likely the exact case from the meeting. A third hairbrush,
`hair-brush` (SKU HB03, "Block Style"), was left standalone in the same
consolidation pass — so whoever ran it treated "Block Style" as a genuinely
different product but folded Ivory into Gray as if it were just a color
option of the same style.

Cannot confirm from this environment whether that's correct: this repo's
Shopify Admin access is deliberately scoped away from production
(`lib/shopify/shop-guard.ts` rejects the production shop domain by design),
the same reason last week's variant-merge audit script
(`scripts/audit-variant-candidates.ts`) hasn't been run against live Shopify
yet. Izzy needs to check the archived HB01 listing against HB02's current
variant structure in Admin to confirm whether Ivory/Gray were a legitimate
color variant or two different styles.

**Once Izzy resolves it:** the only frontend change needed is correcting or
removing that one redirect row. No other routing or product-rendering code
assumes the HB01/HB02 relationship — confirmed by search, nothing else in
the codebase references either handle.

## 7. Regression QA

- Full automated suite: **2108/2108 tests passing**, no regressions from the
  changes above.
- `tsc --noEmit`: one pre-existing error in
  `app/api/catalog/__tests__/route.test.ts`, confirmed present before this
  session's changes too (verified via `git stash`) — unrelated to this work.
- Not yet done: a live click-through pass (variant switching, cart, desktop +
  mobile) against real Shopify data. This environment has no production
  access, so that pass has to happen once Izzy's data lands, against a real
  or staging store.
