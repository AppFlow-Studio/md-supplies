# Industry Audit & Matrix — 2026-08-02

Source: `catalog-full-2026-07-07.csv`, recomputed independently.

## Reproduced July-7 ACTIVE counts — all six exact

| industry tag | active products |
|---|---|
| `industry:clinic` | **6,390** |
| `industry:urgent-care` | **4,344** |
| `industry:home-care` | **3,091** |
| `industry:hrt-surgery` | **531** |
| `industry:pharmacy` | **282** |
| `industry:occ-charities` | **106** |

**Distinct `industry:` values on active products: exactly 6.**

Caveats, stated plainly:
- **Counts overlap.** A product may carry several industry tags; these do not sum
  to 7,384 and must never be presented as separate audiences.
- These are **historical July 7** figures, not current live membership.
- The export **does not prove** current live assignment.
- A generic occurrence of "dental" or "physical therapy" inside another tag does
  **not** establish an approved industry assignment.
- **SKU is not a unique key** (3,166 duplicate SKU values spanning >1 product).

## The 12 requested pages vs. reality

Only **5** of the 12 requested pages have a validated assortment. The 6th real
tag (`occ-charities`) is served by `/solutions/occ`.

| # | Page | Route | Tag | Active | Classification |
|---|---|---|---|---|---|
| 1 | Urgent Care | `/industries/urgent-care` | `industry:urgent-care` | 4,344 | **Approved and supported** |
| 2 | HRT Clinics | `/industries/hrt-clinics` | `industry:hrt-surgery` | 531 | **Approved and supported** |
| 3 | Home Health | `/industries/home-health` | `industry:home-care` | 3,091 | **Approved and supported** |
| 4 | Clinics & Doctors' Offices | `/industries/clinics-doctors-offices` | `industry:clinic` | 6,390 | **Supported but too broad** — 87% of the active catalogue; overlaps every other clinical industry |
| 5 | Pharmacies | `/industries/pharmacies` | `industry:pharmacy` | 282 | **Approved and supported** |
| 6 | EMS & First Responders | `/industries/ems-first-responders` | — | 0 | **Needs product mapping** → noindexed, delisted |
| 7 | Long-Term Care | `/industries/long-term-care` | — | 0 | **Needs product mapping** → noindexed, delisted |
| 8 | Physical Therapy | `/industries/physical-therapy` | — | 0 | **Needs product mapping** → noindexed, delisted |
| 9 | Private Practice | `/industries/private-practice` | — | 0 | **Overlapping** with Clinics & Doctors' Offices → noindexed, delisted |
| 10 | Dental | `/industries/dental` | — | 0 | **Needs product mapping** → noindexed, delisted. A `dental` *category* exists; that is not an industry assignment |
| 11 | Veterinary | `/industries/veterinary` | — | **0** | **Empty — requires client decision.** See below |
| 12 | Community Health | `/industries/community-health` | — | 0 | **Overlapping** with Clinics → noindexed, delisted |

Note: the registry slug for EMS is `ems`, not `ems-first-responders` as
requested. Since the page is unsupported and delisted, renaming it now would
create a redirect for a URL with no validated assortment — deferred until it has
products. Recorded as a Bilal decision.

## What changed in code

`lib/industries.ts` gained two predicates and a filtered export:

- `hasValidatedAssortment()` — does the industry map to a real catalog tag?
- `isIndustryIndexable()` — unique content **AND** a validated assortment. Both
  are required: copy without products is a thin doorway; products without copy
  duplicate the category being wrapped.
- `SUPPORTED_INDUSTRIES` — the filtered list.

That single predicate now drives **metadata robots, the sitemap, the Industries
grid and the homepage strip**, so they can no longer disagree.

**Defect this fixed:** the sitemap emitted **all twelve** industry URLs while
seven of them served `noindex` — asking Google to crawl URLs that then refuse
indexing. Unsupported industries are now excluded from the sitemap, the
Industries grid and the homepage strip, and remain `noindex,follow`.

## Veterinary — conclusion

The July-7 catalogue contains **zero** `industry:veterinary` products, and no
veterinary-specific assortment exists anywhere in the export.

Applied now:
- removed from the Industries grid, the homepage strip and the sitemap;
- serves `noindex,follow`;
- the route still resolves rather than 404ing, because it has unknown organic
  history and a hard 404 on a URL with existing links is worse than a noindexed
  page. **Recorded as a Bilal decision:** if analytics confirm no organic value,
  switch it to a 410 in one hop.

**Not done, deliberately:** no human-medical products were assigned to
Veterinary to fill the page. Doing so would be a fabricated assortment on a
page whose entire value proposition is species-appropriate supply.

**Client decision required** to create a real veterinary assortment: approved
product list or vendor line, plus confirmation the store intends to serve
veterinary buyers at all.

## Overlap warning for whoever builds these out

`industry:clinic` (6,390) covers 87% of active products and subsumes most of
`urgent-care` (4,344). Building Clinics & Doctors' Offices, Private Practice and
Community Health as separate indexable pages off overlapping membership would
produce near-duplicate doorway pages. Recommendation: keep **one** broad clinical
page indexable and differentiate the others by genuinely distinct assortment
before publishing them.

## Live-data comparison

**Not performed.** Comparing July-7 tags against current live membership needs a
fresh read-only export of `industry:` tags per product. That is a read-only
operation and is safe, but it was not run in this pass — treat every count here
as historical.
