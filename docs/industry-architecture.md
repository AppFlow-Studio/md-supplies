# Client-editable industry architecture (Phase 8)

**Status: SPECIFICATION ONLY. Nothing here has been created in Shopify.**
No metaobject definition, metafield definition, collection, or product value
has been written. Every step below is separately reversible and must be applied
separately — see "Applying this" at the end.

This is the industry counterpart to [`fordeer-replacement.md`](fordeer-replacement.md)
and follows the same rule: the client manages content from Shopify Admin, and
the storefront reads Shopify-native custom data rather than raw tags.

## Why not tags

Today an industry page is backed by an `industry:*` product tag. Tags are the
wrong runtime primitive here:

- They are a flat global namespace with no validation — `industry:clinic` and a
  typo'd `industry:clinics` are indistinguishable to Shopify.
- They carry no content. Title, meta description, H1, buying guide and FAQ all
  live in `lib/industries.ts`, so the client cannot change a word without a
  developer and a deploy.
- They cannot express "approved for a page" separately from "mentioned
  somewhere". A generic occurrence of `dental` inside another tag does not
  establish an industry assignment, but a tag-driven system invites exactly
  that inference.

Tags remain useful for **audit, proposed migration, reconciliation and
rollback** — that is what `scripts/industries-mapping-dryrun.mjs` uses them
for. They must not be the runtime source.

## Data model

### Metaobject: `industry`

Content → Metaobjects → Add definition. Name `Industry`, type `industry`.

| Field key | Type | Req | Notes |
|---|---|:--:|---|
| `internal_name` | Single line text | ✓ | Admin-only label |
| `display_name` | Single line text | ✓ | Customer-facing name |
| `slug` | Single line text | ✓ | URL segment; must match the route |
| `active` | Boolean | ✓ | Off ⇒ page not built, not linked |
| `indexable` | Boolean | ✓ | Off ⇒ `noindex,follow`, excluded from sitemap |
| `primary_keyword` | Single line text | | Ad-group intent |
| `secondary_keywords` | List of single line text | | |
| `seo_title` | Single line text | | ≤60 chars |
| `meta_description` | Multi line text | | ≤160 chars |
| `h1` | Single line text | ✓ | Must be unique across industries |
| `short_intro` | Multi line text | ✓ | One paragraph, renders ABOVE the grid |
| `long_buying_guide` | Rich text | | Renders BELOW the grid |
| `hero_image` | File reference (image) | | |
| `hero_alt` | Single line text | | Required when `hero_image` is set |
| `trust_points` | List of single line text | | Verified claims only |
| `faq_entries` | List of metaobject refs → `faq_entry` | | Unique per industry |
| `featured_categories` | List of collection refs | | 4–8, must be non-empty |
| `featured_products` | List of product refs | | Optional curation |
| `primary_cta_text` | Single line text | | Defaults to "Shop supplies" |
| `primary_cta_url` | URL | | |
| `ads_value_proposition` | Multi line text | | Must match ad copy |
| `contact_cta_text` | Single line text | | Sourcing CTA |
| `contact_cta_url` | URL | | |

`faq_entry` is a small companion metaobject (`question`, `answer`) so FAQs are
reusable and individually editable.

**Storefront access must be enabled on the definition**, or the storefront
reads nothing and every page fails closed.

### Product metafield: `custom.industries`

| Property | Value |
|---|---|
| Namespace / key | `custom.industries` |
| Type | `list.metaobject_reference` |
| Reference | `industry` |
| Storefront access | **Enabled** (required) |

### One automated collection per approved industry

Handle matches the industry `slug`. Condition:

> Product metafield → `custom.industries` → contains → *(the industry metaobject)*

Division of responsibility, and it matters:

- The **metaobject** controls page CONTENT (copy, SEO, FAQ, CTAs).
- The **automated collection** controls PRODUCTS — and therefore filters, sort,
  pagination and result counts, which the shared category discovery system
  already handles. The industry page gets the full catalogue view for free
  rather than a hand-picked six.

## Client workflow

1. Content → Metaobjects → Industry → add an entry; fill copy and SEO.
2. Products → a product → Metafields → Industries → select industries.
3. Products → Collections → new automated collection using the condition above.
4. Toggle `active` / `indexable` to control navigation, sitemap and robots.

No deploy is required for any of it.

## Storefront query fragment

Written against the documented schema, **not verified against the live shop**
(no definitions exist yet). Treat as a starting point to validate once the
definitions are created.

```graphql
fragment IndustryFields on Metaobject {
  handle
  displayName:  field(key: "display_name")   { value }
  slug:         field(key: "slug")           { value }
  active:       field(key: "active")         { value }
  indexable:    field(key: "indexable")      { value }
  seoTitle:     field(key: "seo_title")      { value }
  metaDesc:     field(key: "meta_description") { value }
  h1:           field(key: "h1")             { value }
  shortIntro:   field(key: "short_intro")    { value }
  buyingGuide:  field(key: "long_buying_guide") { value }
  heroImage:    field(key: "hero_image")     { reference { ... on MediaImage { image { url altText width height } } } }
  heroAlt:      field(key: "hero_alt")       { value }
  trustPoints:  field(key: "trust_points")   { values }
  faqEntries:   field(key: "faq_entries")    {
    references(first: 20) {
      nodes { ... on Metaobject {
        question: field(key: "question") { value }
        answer:   field(key: "answer")   { value }
      } }
    }
  }
  featuredCategories: field(key: "featured_categories") {
    references(first: 8) { nodes { ... on Collection { handle title } } }
  }
}
```

### Fail-closed rules

Mirroring `lib/labels/shopify-labels.ts`:

- Missing definition, missing Storefront access, or a null reference ⇒ the
  industry is treated as **not active**. It is not rendered, not linked, and not
  listed in the sitemap. It never renders half a page.
- `active=false` or `indexable=false` are honoured independently: an active
  non-indexable industry is reachable but `noindex,follow`.
- An industry whose automated collection resolves to **zero products** must not
  be published as an indexable page — that is the thin-doorway failure the
  Veterinary finding is about.
- Client-authored copy is text, never HTML: no markup injection.

## Current-to-proposed mapping

Generated read-only by `scripts/industries-mapping-dryrun.mjs` from the July-7
export. Reproduced counts (ACTIVE products, overlapping):

| Proposed industry metaobject | Active products | Source tag |
|---|---:|---|
| `clinics-doctors-offices` | 6,390 | `industry:clinic` |
| `urgent-care` | 4,344 | `industry:urgent-care` |
| `home-health` | 3,091 | `industry:home-care` |
| `hrt-clinics` | 531 | `industry:hrt-surgery` |
| `pharmacies` | 282 | `industry:pharmacy` |

`industry:occ-charities` (106) is deliberately **not** migrated — it is served
by `/solutions/occ` as a category, and giving it an industry metaobject would
create a second competing OCC surface.

Seven routed industry pages have **no** approved membership in the export:
`ems`, `long-term-care`, `physical-therapy`, `private-practice`, `dental`,
`veterinary`, `community-health`. This migration does **not** invent products
for them. Each needs a client decision: create a real assortment, or retire the
page.

Outputs (all in `docs/audits/2026-08-02-catalog-cro/`):

| File | Purpose |
|---|---|
| `industry-current-to-proposed.csv` | Per product: current tags → proposed refs |
| `industry-affected-products.csv` | One row per (industry, product) to write |
| `industry-rollback.json` | Each product's CURRENT tags — restore source |
| `industry-unmapped.csv` | Industry tags with no approved target |
| `industry-summary.md` | Counts and the decisions awaiting a human |

Identity is `product_id`. **SKU is never an identity** — 3,166 SKUs span more
than one product.

## Applying this

Not authorized here and not performed. In order, each verified before the next:

1. Create the `faq_entry` and `industry` metaobject definitions.
2. Create the `custom.industries` product metafield definition.
3. Create one automated collection per approved industry.
4. Write product metafield values from `industry-affected-products.csv`.
5. Point the storefront at the metaobject (behind a flag, default off).
6. Retire the `industry:*` tags **only** after 1–5 are verified in production.

Rollback: `industry-rollback.json` restores the current tag state. Steps 1–3
are additive and are reverted by deleting what they created; step 4 is reverted
by clearing the metafield. Do not combine steps — a single irreversible
operation is exactly what this split exists to prevent.
