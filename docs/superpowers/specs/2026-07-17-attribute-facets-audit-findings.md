# Attribute Facets — Audit Findings

Live-data findings from `docs/superpowers/plans/2026-07-17-attribute-facet-audit.md`,
run 2026-07-17 against the live Storefront API.

## Wired in this plan (Task 3)

- **Dental** (`dental`) and **IV Therapy** (`iv-therapy`) — both had a fully live,
  populated needle-gauge metafield family (`needle_gauge`, `needle_length`,
  `size_length_`, `order_size`) with no existing `filterRegistry` entry. Wired to
  the same shape as the existing `needles-syringes` entry.

## Already correctly wired, no action needed

- **Mobility** (`mobility`) — wheelchair-width attribute tags already covered by
  the existing `APPROVED_METAFIELDS.size` entry.
- **Needles & Syringes** (`needles-syringes`) — gauge/lancet attribute tags already
  covered by the existing `needleGauge`/`length` entries.

## Flagged — needs a new Shopify metafield definition first (not built here)

- **Surgical Sutures** (`surgical-sutures`) — suture-gauge tags (`0-sutures`
  through `10-0-sutures`) have no live size/gauge-shaped metafield today (only
  `material`, which doesn't represent gauge). Needs a new Storefront-filterable
  metafield definition (mirroring how `needle_gauge` was set up) before this can
  be wired.
- **Needles & Syringes volume family** (`Xcc-syringe`, `X-gal-sharps` tags) — the
  `APPROVED_METAFIELDS.volume` rule is already registered in code but the
  `volume` metafield isn't yet populated/filterable live on this collection
  (pre-existing gap, documented in `lib/filter-registry.ts`'s own comments — not
  something this audit found new).

## Attribute-collection classification — inconclusive, needs a follow-up plan

`audit/attribute-collection-candidate-report.md`'s purity/size heuristic cannot
distinguish a real attribute-value collection (`25g-hypodermic-needles`) from a
real, independently-meaningful product-type collection (`stethoscopes`) — both
score identically as "small, pure subsets of an L1." 460 of 695 live collections
passed the heuristic, far more than usable. The report's raw data does show a
promising signal: attribute-shaped handles are visibly name-patterned (`-\d+g-`,
`-\d+cc-`, `-\d+-seat`, `astm-level-\d+-`, etc.) the same way `subcategory:` tags
already were before `ATTRIBUTE_SUBCATEGORY_PATTERNS` was built. A follow-up plan
should build and validate an equivalent name-pattern denylist against this
report's 460 candidates (same "false negatives OK, false positives not OK" bar),
not attempt to wire facets from the raw candidate list directly.

## Recommendation

Ship Task 3's two wired categories now — they're free, confirmed-live wins. Open
a follow-up ticket for the catalog team on the two flagged metafield gaps
(Surgical Sutures gauge, Needles & Syringes volume). Scope the collection-side
pattern-curation work as its own plan when there's appetite for it — it's real
taxonomy work, not a quick follow-on to this audit.
