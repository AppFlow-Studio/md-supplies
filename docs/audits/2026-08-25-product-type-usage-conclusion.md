# Product Type usage conclusion — 2026-08-25

**Ticket:** MDSupplies Headless Category Navigation Remediation, item 5 ("Determine Whether Product Type Affects the Frontend").

## Conclusion

Product Type (Shopify's `productType`/`product_type` field) has **no effect** on
category routing, category membership, subcategory grouping, navigation, or
fallback categorization anywhere in this codebase.

Its only live reference is `lib/filter-registry.ts`'s `PRODUCT_TYPE` rule, used in
exactly two places:
- `SEARCH_FACET_RULES` — the allowlist for the global `/search` page's facets.
- `INPUT_VALIDATORS.productType` — validates a hand-crafted filter input for that
  same search facet, if rendered.

No category route (`filterRegistry[handle]` in the same file) references it — every
category's "Type" filter is `custom.type`, a *metafield*, which is a different field
despite the similar label. `lib/category-tree.ts` and `lib/category-nav.ts`, which
own all category membership/routing/navigation, are built entirely from
`category:`/`subcategory:` **product tags** and never read Product Type.

## Why this matters for the meeting anecdote

A Product Type edit was reported as coinciding with a previously-missing product
becoming visible. Given the above, Product Type cannot have caused that in this
codebase. The far more likely explanation is the cache-invalidation gap fixed in
this plan's Task 2: the webhook handler didn't invalidate collection cache tags on
a product save, so a tag/category change could take up to 5 minutes (the background
revalidate window) to appear — coincidentally around the time someone might notice
a save "finally" taking effect, regardless of which field was actually edited.

## Regression guard

`lib/__tests__/filter-registry.test.ts` — "Product Type usage conclusion" — asserts
Product Type is never added to a per-category or per-industry facet registry entry.
If this test starts failing, this conclusion is stale and should be re-verified
before merging whatever added the reference.
