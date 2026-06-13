# Redirect QA — T4

## Pre-launch spot-check

Run against local dev server (`npm run dev`, port 3000):

```bash
curl -sI http://localhost:3000/<old-path> | grep -E 'HTTP|Location'
```

| Row | Old path | Expected destination | Status | Location header | Pre-launch | Post-cutover |
|-----|----------|---------------------|--------|-----------------|------------|-------------|
| 1   | `/Medical-Supply-Store.html` | `/categories` | 301 | | | |
| 4   | `/supplies-by-vendor/Drive-Medical-VQTWVE3SWE.html` | `/partners/drive-medical` | 301 | | | |
| 6   | `/articles/types-of-sutures.html` | `/blog/types-of-sutures` | 301 | | | |
| 7   | `/Durable-Equipment-Medical.html` | `/partners/drive-medical` | 301 | | | |
| 8   | `/supplies-by-vendor/Dynarex-MM7QQM8CLP.html` | `/partners/dynarex` | 301 | | | |
| 10  | `/Medical-Supplies-for-Doctors.html` | `/industries/private-practice` | 301 | | | |
| 13  | `/articles/types-of-needles.html` | `/blog/types-of-needles` | 301 | | | |
| 15  | `/face-masks-n95-kn95.html` | `/category/face-masks` | 301 | | | |
| 22  | `/medical-supply-store/Face-Masks-CYR82C7EBL.html?formularyId=1` | `/category/face-masks` | 301 | | | |
| 23  | `/medical-supply-store/Hygiene-WQ2ENW7KU6.html` | `/category/hygiene` | 301 | | | |
| 25  | `/all-categories.html` | `/categories` | 301 | | | |
| 26  | `/medical-supply-store/Gloves-G78R26U43E.html` | `/category/gloves` | 301 | | | |
| —   | `/brands` | `/partners` | 301 | | | |
| —   | `/brands/drive-medical` | `/partners/drive-medical` | 301 | | | |
| —   | `/brands/dynarex` | `/partners/dynarex` | 301 | | | |

## Quick local spot-check commands

```bash
# Start dev server first: npm run dev

curl -sI http://localhost:3000/Medical-Supply-Store.html       | grep -E 'HTTP|Location'
curl -sI http://localhost:3000/all-categories.html             | grep -E 'HTTP|Location'
curl -sI http://localhost:3000/brands/drive-medical            | grep -E 'HTTP|Location'
curl -sI http://localhost:3000/articles/types-of-sutures.html | grep -E 'HTTP|Location'
curl -sI "http://localhost:3000/medical-supply-store/Face-Masks-CYR82C7EBL.html?formularyId=99" | grep -E 'HTTP|Location'
```

Expected for each: `HTTP/1.1 301` + correct `Location` header.

## Rows pending old URL from handoff

Once the old URLs are confirmed, add them to `proxy.ts` and fill this table:

| Row | Product | Expected status | Old URL (from handoff) | Pre-launch | Post-cutover |
|-----|---------|----------------|----------------------|------------|-------------|
| 2   | Narcotics Storage | 410 | PENDING-HANDOFF | | |
| 3   | Dynarex specimen container | 301 → `/category/needles-syringes` | PENDING-HANDOFF | | |
| 5   | Exel insulin syringe | 301 → `/category/needles-syringes` | PENDING-HANDOFF | | |
| 9   | 10cc syringe | 301 → `/category/needles-syringes` | PENDING-HANDOFF | | |
| 11  | NDD EasyOne Spirettes | 301 → `/category/respiratory` | PENDING-HANDOFF | | |
| 12  | Leg immobilizer | 301 → `/category/immobilizers` | PENDING-HANDOFF | | |
| 14  | Trauma dressing | 301 → `/category/wound-care` | PENDING-HANDOFF | | |
| 16  | Feather blades | 301 → `/category/surgery-procedure` | PENDING-HANDOFF | | |
| 17  | Thorne VeganPro Vanilla | 410 | PENDING-HANDOFF | | |
| 18  | Thorne VeganPro Chocolate | 410 | PENDING-HANDOFF | | |
| 19  | Graham drape sheet | 301 → `/category/surgery-procedure` | PENDING-HANDOFF | | |
| 20  | Triangular bandage | 301 → `/category/wound-care` | PENDING-HANDOFF | | |
| 21  | Injectables | 410 | PENDING-HANDOFF | | |
| 24  | Glucose testing | 301 → `/category/testing` | PENDING-HANDOFF | | |

## Post-cutover re-check

After DNS cutover, re-run all spot-check commands against the live domain. A redirect chain (e.g. `301 → 301`) means a target is itself redirected — fix by pointing directly to the final canonical.
