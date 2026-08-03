# Industry migration — DRY RUN (no writes performed)

Source: `C:/Users/Bilal/Downloads/catalog-full-2026-07-07.csv`  
Unique products: **10,326**  
Products carrying ≥1 `industry:` tag: **7,368**

## Proposed ACTIVE membership per industry metaobject

| Industry metaobject | Active products | Source tag |
|---|---:|---|
| `urgent-care` | 4,344 | `industry:urgent-care` |
| `hrt-clinics` | 531 | `industry:hrt-surgery` |
| `home-health` | 3,091 | `industry:home-care` |
| `clinics-doctors-offices` | 6,390 | `industry:clinic` |
| `pharmacies` | 282 | `industry:pharmacy` |

Counts OVERLAP — a product may belong to several industries.

## Deliberately not migrated

- `industry:occ-charities` — served by `/solutions/occ` as a category. Mapping it to an industry metaobject would create a second competing OCC surface.

## Industry pages with NO approved product membership

These have no `industry:` tag in the export. They are NOT given products here — inventing membership is the failure mode this migration exists to prevent.

- `ems` — requires a client decision (create a real assortment, or retire the page)
- `long-term-care` — requires a client decision (create a real assortment, or retire the page)
- `physical-therapy` — requires a client decision (create a real assortment, or retire the page)
- `private-practice` — requires a client decision (create a real assortment, or retire the page)
- `dental` — requires a client decision (create a real assortment, or retire the page)
- `veterinary` — requires a client decision (create a real assortment, or retire the page)
- `community-health` — requires a client decision (create a real assortment, or retire the page)

## Applying this plan

Not performed here and not authorized. Applying it requires, in order:
1. Create the `industry` metaobject definition (see `docs/industry-architecture.md`).
2. Create the `custom.industries` product metafield.
3. Create one automated collection per approved industry.
4. Write metafield values from `industry-affected-products.csv`.
5. Keep `industry-rollback.json` as the restore source.

Each step is independently reversible. Do not combine them.
