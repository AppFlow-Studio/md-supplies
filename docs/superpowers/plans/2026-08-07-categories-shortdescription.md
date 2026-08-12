# DEV-LAUNCH-03: Categories Hub Short Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every one of the 25 category cards on `/categories` renders its approved, verbatim short description, sourced from one canonical place instead of the (often-blank) live Shopify collection description.

**Architecture:** Add a required `shortDescription: string` field to the existing `L1CategoryDef` registry type in `lib/category-tree.ts` and populate all 25 entries with the ticket's approved copy, keyed by the registry's canonical `tag` (not by Shopify `collectionHandle`). `buildL1Tiles()` already spreads `L1CategoryDef` into the tile objects the page renders, so the field flows through with no new plumbing. `app/categories/page.tsx` switches its "Browse All Categories" grid from the old `col?.description &&` guard (Shopify-sourced, often blank) to unconditionally rendering `tile.shortDescription` (registry-sourced, always present because the field is required).

**Tech Stack:** TypeScript, Next.js App Router (Server Components), Vitest (unit), Playwright + axe-core (e2e/a11y).

## Global Constraints

- **Verbatim copy only.** The 25 descriptions are approved launch copy — use them exactly as given in the ticket. Do not rewrite, trim, expand, or generate a description for any category. (All 25 are present in the ticket table, so nothing is BLOCKED.)
- **Testing category key.** Registry `tag` for the "Testing" category is `testing`; `collectionHandle` (routing/Shopify lookup) is `testing-screening`. The new field must be keyed by `tag`, so the "Testing" row's copy goes on the `testing` entry, not a `testing-screening` entry (no such tag exists in the registry).
- **Central source only.** Descriptions must live in `lib/category-tree.ts` (the registry). Do not add per-component hardcoded copy or a second description source.
- **No card may show:** blank copy, duplicated copy (two categories sharing text), placeholder text, raw HTML, or `undefined`.
- **Readable at 390, 768, 1024, and 1440px widths.**
- **Titles, descriptions, and card links stay keyboard accessible.**

---

### Task 1: Registry — add `shortDescription` field and populate all 25 categories

**Files:**
- Modify: `lib/category-tree.ts:31-83` (the `L1CategoryDef` type and `CATEGORY_TREE_L1` array)
- Test: `lib/__tests__/category-tree.test.ts`

**Interfaces:**
- Produces: `L1CategoryDef.shortDescription: string` (required field) — every downstream consumer of `CATEGORY_TREE_L1` / `L1Tile` (via `buildL1Tiles`) gets this field for free since `L1Tile = L1CategoryDef & { productCount: number }` already spreads it.

- [ ] **Step 1: Write the failing test**

Add this new `describe` block to `lib/__tests__/category-tree.test.ts` (place it directly after the existing `describe('CATEGORY_TREE_L1', ...)` block, i.e. after line 42):

```ts
describe('CATEGORY_TREE_L1 short descriptions (DEV-LAUNCH-03)', () => {
  // Approved launch copy, verbatim, from the DEV-LAUNCH-03 ticket's Appendix A.
  // Keyed by registry `tag` — NOT by `collectionHandle` (Testing's tag is
  // `testing`; `testing-screening` is only the Shopify collection handle).
  const APPROVED_SHORT_DESCRIPTIONS: Record<string, string> = {
    'gloves': 'Exam and procedure gloves in nitrile, latex, and vinyl options for clinical, laboratory, and facility use.',
    'wound-care': 'Dressings, gauze, bandages, tapes, irrigation supplies, and other essentials for routine wound care.',
    'needles-syringes': 'Needles, syringes, and injection accessories in a range of gauges, sizes, and safety configurations.',
    'surgical-sutures': 'Absorbable and non-absorbable sutures, needles, and wound-closure supplies for clinical procedures.',
    'testing': 'Diagnostic, screening, specimen-collection, and point-of-care testing supplies for healthcare settings.',
    'exam-room': 'Everyday exam-room equipment and supplies, including tables, stools, lighting, and patient-care essentials.',
    'respiratory': 'Respiratory-care supplies for oxygen delivery, nebulization, airway support, and routine patient treatment.',
    'mobility': 'Wheelchairs, walkers, canes, rollators, and mobility accessories for patient support and daily movement.',
    'patient-therapy-rehab': 'Therapy, rehabilitation, exercise, and positioning products that support recovery and patient mobility.',
    'surgery-procedure': 'Procedure-room instruments, kits, trays, and accessories for minor surgery and clinical procedures.',
    'apparel': 'Medical apparel, gowns, caps, footwear, scrubs, and protective clothing for healthcare teams and patients.',
    'hygiene': 'Personal-hygiene and patient-care products for bathing, oral care, grooming, and everyday cleanliness.',
    'disinfectants': 'Cleaning and disinfection products for surfaces, equipment, hands, and infection-control routines.',
    'home-care': 'Practical medical and personal-care supplies designed for patients, caregivers, and home-health use.',
    'emergency-supplies': 'First-aid, trauma, rescue, and emergency-response supplies for clinics, facilities, and mobile teams.',
    'incontinence': 'Briefs, underpads, liners, wipes, and related products for dependable incontinence and skin care.',
    'iv-therapy': 'IV administration, infusion, access, and securement supplies for clinical fluid and medication delivery.',
    'urology-ostomy': 'Catheters, drainage, ostomy, and related accessories for urological and ostomy care.',
    'sterilization': 'Sterilization pouches, wraps, indicators, cleaners, and accessories for instrument-processing workflows.',
    'dental': 'Dental procedure, examination, infection-control, and patient-care supplies for dental practices.',
    'housekeeping-janitorial': 'Facility-cleaning, waste-handling, paper, and janitorial supplies for healthcare environments.',
    'bariatric': 'Bariatric patient-care and mobility equipment designed for higher weight capacities and added support.',
    'room-furniture': 'Seating, exam tables, cabinets, and room furnishings for treatment, consultation, and patient-care spaces.',
    'face-masks': 'Procedure masks, respirators, and face coverings for clinical, facility, and everyday protective use.',
    'pharmacy-products': 'Dispensing, labeling, packaging, counting, and patient-use supplies for pharmacy operations.',
  }

  it('has a nonempty, non-placeholder, HTML-free shortDescription for every one of the 25 approved categories', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      expect(l1.shortDescription, `${l1.tag} is missing a shortDescription`).toBeTruthy()
      expect(l1.shortDescription.trim().length, `${l1.tag} shortDescription is blank`).toBeGreaterThan(0)
      expect(l1.shortDescription, `${l1.tag} shortDescription contains raw HTML`).not.toMatch(/[<>]/)
    }
  })

  it('has exactly the approved verbatim copy for every tag (client-liability launch copy)', () => {
    for (const l1 of CATEGORY_TREE_L1) {
      const approved = APPROVED_SHORT_DESCRIPTIONS[l1.tag]
      expect(approved, `${l1.tag} has no approved copy in the test's approved-copy table`).toBeDefined()
      expect(l1.shortDescription).toBe(approved)
    }
  })

  it('has no duplicated description text across categories', () => {
    const descriptions = CATEGORY_TREE_L1.map((l1) => l1.shortDescription)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: FAIL — `l1.shortDescription` is `undefined` (the field doesn't exist on `L1CategoryDef` yet), so the "nonempty" and "verbatim copy" assertions fail.

- [ ] **Step 3: Add the field to the type and populate all 25 entries**

In `lib/category-tree.ts`, add `shortDescription: string` to the `L1CategoryDef` type (line 51-52, right after `navGroup`):

```ts
  navGroup: 'primary' | 'more'
  // Approved launch copy for the /categories hub card (DEV-LAUNCH-03,
  // Appendix A) — verbatim, client-approved text. Do not rewrite, trim, or
  // auto-generate; if a category needs new copy, that's a client decision.
  shortDescription: string
}
```

Then replace the entire `CATEGORY_TREE_L1` array (lines 57-83) with:

```ts
export const CATEGORY_TREE_L1: readonly L1CategoryDef[] = [
  { tag: 'gloves', displayName: 'Gloves', collectionHandle: 'gloves', navGroup: 'primary', shortDescription: 'Exam and procedure gloves in nitrile, latex, and vinyl options for clinical, laboratory, and facility use.' },
  { tag: 'wound-care', displayName: 'Wound Care', collectionHandle: 'wound-care', navGroup: 'primary', shortDescription: 'Dressings, gauze, bandages, tapes, irrigation supplies, and other essentials for routine wound care.' },
  { tag: 'needles-syringes', displayName: 'Needles & Syringes', collectionHandle: 'needles-syringes', navGroup: 'primary', shortDescription: 'Needles, syringes, and injection accessories in a range of gauges, sizes, and safety configurations.' },
  { tag: 'surgical-sutures', displayName: 'Surgical Sutures', collectionHandle: 'surgical-sutures', navGroup: 'primary', shortDescription: 'Absorbable and non-absorbable sutures, needles, and wound-closure supplies for clinical procedures.' },
  { tag: 'testing', displayName: 'Testing', collectionHandle: 'testing-screening', navGroup: 'primary', shortDescription: 'Diagnostic, screening, specimen-collection, and point-of-care testing supplies for healthcare settings.' },
  { tag: 'exam-room', displayName: 'Exam Room', collectionHandle: 'exam-room', navGroup: 'primary', shortDescription: 'Everyday exam-room equipment and supplies, including tables, stools, lighting, and patient-care essentials.' },
  { tag: 'respiratory', displayName: 'Respiratory', collectionHandle: 'respiratory', navGroup: 'primary', shortDescription: 'Respiratory-care supplies for oxygen delivery, nebulization, airway support, and routine patient treatment.' },
  { tag: 'mobility', displayName: 'Mobility', collectionHandle: 'mobility', navGroup: 'primary', shortDescription: 'Wheelchairs, walkers, canes, rollators, and mobility accessories for patient support and daily movement.' },
  { tag: 'patient-therapy-rehab', displayName: 'Patient Therapy & Rehab', collectionHandle: 'patient-therapy-rehab', navGroup: 'primary', shortDescription: 'Therapy, rehabilitation, exercise, and positioning products that support recovery and patient mobility.' },
  { tag: 'surgery-procedure', displayName: 'Surgery & Procedure', collectionHandle: 'trocars-trocar-kits', navGroup: 'primary', shortDescription: 'Procedure-room instruments, kits, trays, and accessories for minor surgery and clinical procedures.' },
  { tag: 'apparel', displayName: 'Apparel', collectionHandle: 'capes-gowns', navGroup: 'primary', shortDescription: 'Medical apparel, gowns, caps, footwear, scrubs, and protective clothing for healthcare teams and patients.' },
  { tag: 'hygiene', displayName: 'Hygiene', collectionHandle: 'hygiene', navGroup: 'primary', shortDescription: 'Personal-hygiene and patient-care products for bathing, oral care, grooming, and everyday cleanliness.' },
  { tag: 'disinfectants', displayName: 'Disinfectants', collectionHandle: 'disinfectants', navGroup: 'primary', shortDescription: 'Cleaning and disinfection products for surfaces, equipment, hands, and infection-control routines.' },
  { tag: 'home-care', displayName: 'Home Care', collectionHandle: 'home-care', navGroup: 'more', shortDescription: 'Practical medical and personal-care supplies designed for patients, caregivers, and home-health use.' },
  { tag: 'emergency-supplies', displayName: 'Emergency Supplies', collectionHandle: 'emergency-supplies', navGroup: 'more', shortDescription: 'First-aid, trauma, rescue, and emergency-response supplies for clinics, facilities, and mobile teams.' },
  { tag: 'incontinence', displayName: 'Incontinence', collectionHandle: 'incontinence', navGroup: 'more', shortDescription: 'Briefs, underpads, liners, wipes, and related products for dependable incontinence and skin care.' },
  { tag: 'iv-therapy', displayName: 'IV Therapy', collectionHandle: 'iv-therapy', navGroup: 'more', shortDescription: 'IV administration, infusion, access, and securement supplies for clinical fluid and medication delivery.' },
  { tag: 'urology-ostomy', displayName: 'Urology & Ostomy', collectionHandle: 'urology-ostomy', navGroup: 'more', shortDescription: 'Catheters, drainage, ostomy, and related accessories for urological and ostomy care.' },
  { tag: 'sterilization', displayName: 'Sterilization', collectionHandle: 'sterilization', navGroup: 'more', shortDescription: 'Sterilization pouches, wraps, indicators, cleaners, and accessories for instrument-processing workflows.' },
  { tag: 'dental', displayName: 'Dental', collectionHandle: 'dental', navGroup: 'more', shortDescription: 'Dental procedure, examination, infection-control, and patient-care supplies for dental practices.' },
  { tag: 'housekeeping-janitorial', displayName: 'Housekeeping & Janitorial', collectionHandle: 'housekeeping-janitorial', navGroup: 'more', shortDescription: 'Facility-cleaning, waste-handling, paper, and janitorial supplies for healthcare environments.' },
  { tag: 'bariatric', displayName: 'Bariatric', collectionHandle: 'bariatric', navGroup: 'more', shortDescription: 'Bariatric patient-care and mobility equipment designed for higher weight capacities and added support.' },
  { tag: 'room-furniture', displayName: 'Room Furniture', collectionHandle: 'seating', navGroup: 'more', shortDescription: 'Seating, exam tables, cabinets, and room furnishings for treatment, consultation, and patient-care spaces.' },
  { tag: 'face-masks', displayName: 'Face Masks', collectionHandle: 'face-coverings', navGroup: 'more', shortDescription: 'Procedure masks, respirators, and face coverings for clinical, facility, and everyday protective use.' },
  { tag: 'pharmacy-products', displayName: 'Pharmacy Products', collectionHandle: 'pharmacy-products', navGroup: 'more', shortDescription: 'Dispensing, labeling, packaging, counting, and patient-use supplies for pharmacy operations.' },
] as const
```

(Only the added `shortDescription` values are new — every `tag`/`displayName`/`collectionHandle`/`navGroup` value is unchanged from the current file.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/category-tree.test.ts`
Expected: PASS — all tests in the file green, including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add lib/category-tree.ts lib/__tests__/category-tree.test.ts
git commit -m "feat(categories): add approved shortDescription to L1 category registry"
```

---

### Task 2: Categories hub — render registry description instead of Shopify collection description

**Files:**
- Modify: `app/categories/page.tsx:136-165` (the "Browse All Categories" grid map)

**Interfaces:**
- Consumes: `L1Tile.shortDescription: string` (from Task 1, guaranteed nonempty).

- [ ] **Step 1: Replace the card body**

In `app/categories/page.tsx`, replace lines 136-165:

```tsx
            {l1Tiles.map((tile) => {
              const col = allCollectionsByHandle.get(tile.collectionHandle)
              const banner = getCategoryBannerConfig(tile.collectionHandle)
              return (
                <Link
                  key={tile.tag}
                  href={ROUTES.category(tile.collectionHandle)}
                  className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
                >
                  <div className="relative w-full aspect-[4/3]">
                    {/* No initial-letter placeholder — see the note above. */}
                    <CategoryImage
                      bannerPath={banner.path}
                      alt={banner.alt}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                      {tile.displayName}
                    </p>
                    {col?.description && (
                      <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
```

with:

```tsx
            {l1Tiles.map((tile) => {
              const banner = getCategoryBannerConfig(tile.collectionHandle)
              return (
                <Link
                  key={tile.tag}
                  href={ROUTES.category(tile.collectionHandle)}
                  className="group bg-white border border-gray-200 hover:border-navy-900 transition-colors overflow-hidden"
                >
                  <div className="relative w-full aspect-[4/3]">
                    {/* No initial-letter placeholder — see the note above. */}
                    <CategoryImage
                      bannerPath={banner.path}
                      alt={banner.alt}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-navy-900 text-[14px] font-semibold group-hover:underline">
                      {tile.displayName}
                    </p>
                    <p className="text-gray-500 text-[12px] mt-1 line-clamp-2">
                      {tile.shortDescription}
                    </p>
                  </div>
                </Link>
              )
            })}
```

Note: `col` is removed entirely from this block (it was only ever used for `col?.description`). `allCollectionsByHandle` itself stays — it's still used by the Popular Categories strip earlier in the file. Every card now always renders a title `<p>` and a description `<p>` with the same `line-clamp-2` treatment, which is what keeps card heights visually consistent (previously, cards without a Shopify description were shorter than ones with one).

- [ ] **Step 2: Typecheck and run the unit suite**

Run: `npx tsc --noEmit`
Expected: no new errors (confirms `col` removal didn't leave an unused-variable/import problem and `tile.shortDescription` typechecks).

Run: `npx vitest run`
Expected: full suite still passes (this change touches no function `lib/__tests__` covers directly, but confirms no regression).

- [ ] **Step 3: Commit**

```bash
git add app/categories/page.tsx
git commit -m "feat(categories): render approved registry description on every hub card"
```

---

### Task 3: E2E coverage — card descriptions + readability at required widths + keyboard/a11y

**Files:**
- Create: `e2e/categories-hub.spec.ts`
- Modify: `e2e/axe.spec.ts:4-13` (add `/categories` to the scanned routes)

**Interfaces:**
- Consumes: the rendered `/categories` page from Task 2 (25 `<a>` cards inside the "Browse All Categories" section, each containing exactly two `<p>` elements: title, then description).

- [ ] **Step 1: Create the e2e spec**

Create `e2e/categories-hub.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * DEV-LAUNCH-03 evidence: every "Browse All Categories" card must show its
 * approved, non-placeholder description text, and stay readable at every
 * mandated launch width.
 *
 * Run against an already-built server:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/categories-hub.spec.ts
 */

const SHOTS = 'docs/audits/2026-08-07-dev-launch-03/screenshots'
mkdirSync(SHOTS, { recursive: true })

const VIEWPORTS = [
  { w: 390, h: 844, name: '390x844' },
  { w: 768, h: 1024, name: '768x1024' },
  { w: 1024, h: 768, name: '1024x768' },
  { w: 1440, h: 900, name: '1440x900' },
] as const

test.describe('categories hub — card descriptions', () => {
  test('every one of the 25 cards shows unique, nonempty description text', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' })
    const grid = page.locator('section', { has: page.getByRole('heading', { name: 'Browse All Categories' }) })
    const cards = grid.locator('a')
    await expect(cards).toHaveCount(25)

    const count = await cards.count()
    const descriptions: string[] = []
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const paragraphs = card.locator('p')
      await expect(paragraphs).toHaveCount(2)
      const title = (await paragraphs.nth(0).textContent())?.trim() ?? ''
      const description = (await paragraphs.nth(1).textContent())?.trim() ?? ''
      expect(title.length, `card ${i} has no title`).toBeGreaterThan(0)
      expect(description.length, `card ${i} ("${title}") has a blank description`).toBeGreaterThan(0)
      expect(description, `card ${i} ("${title}") description duplicates its title`).not.toBe(title)
      descriptions.push(description)
    }
    expect(new Set(descriptions).size, 'two or more cards show duplicated description text').toBe(descriptions.length)
  })

  for (const vp of VIEWPORTS) {
    test(`renders readably at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/categories', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await expect(page.getByRole('heading', { name: 'Browse All Categories' })).toBeVisible()
      await page.screenshot({ path: `${SHOTS}/categories-hub__${vp.name}.png`, fullPage: true })
    })
  }
})
```

- [ ] **Step 2: Add `/categories` to the axe accessibility sweep**

In `e2e/axe.spec.ts`, add one entry to the `ROUTES` array (line 4-13), e.g. right after the `home` entry:

```ts
const ROUTES: Array<{ path: string; name: string }> = [
  { path: '/', name: 'home' },
  { path: '/categories', name: 'categories-hub' },
  { path: '/category/gloves', name: 'category' },
  { path: '/product/nitrile-exam-gloves-powder-free', name: 'pdp' },
  { path: '/solutions/occ', name: 'occ' },
  { path: '/industries/pharmacy', name: 'industry' },
  { path: '/blog/types-of-needles', name: 'blog' },
  { path: '/cart', name: 'cart' },
  { path: '/account', name: 'account' },
]
```

This is the repo's existing mechanism for "titles, descriptions, and card links remain keyboard accessible" (`wcag2a`/`wcag2aa` tags cover link-name and focus-visibility rules) — no new a11y test file needed.

- [ ] **Step 3: Run the new and modified e2e specs**

Run: `npx playwright test e2e/categories-hub.spec.ts e2e/axe.spec.ts -g "categories-hub"`

Expected: PASS, and 4 screenshots written under `docs/audits/2026-08-07-dev-launch-03/screenshots/`.

**If Playwright cannot run in the current environment** (no browser binaries installed, or `npm run build` can't reach live Shopify data for the webServer step): install browsers with `npx playwright install chromium` and retry once. If it still cannot run (e.g. sandboxed network), fall back to starting `npm run dev`, using the browser automation tool to open `/categories`, resizing the viewport to each of the 4 required widths, and saving a screenshot per width to the scratchpad directory — then say so explicitly rather than claiming the automated e2e run passed.

- [ ] **Step 4: Commit**

```bash
git add e2e/categories-hub.spec.ts e2e/axe.spec.ts
git commit -m "test(categories): cover hub card descriptions, widths, and a11y for DEV-LAUNCH-03"
```

---

### Task 4: Final verification and evidence roundup

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test`
Expected: PASS, including the 3 new `CATEGORY_TREE_L1 short descriptions` tests from Task 1.

- [ ] **Step 2: Run the full e2e suite for the touched routes**

Run: `npx playwright test e2e/categories-hub.spec.ts e2e/axe.spec.ts`
Expected: PASS. (See Task 3 Step 3's fallback if this environment can't run Playwright.)

- [ ] **Step 3: Gather the ticket's required evidence**

Confirm and note for the ticket:
- **Screenshots at desktop + mobile widths:** `docs/audits/2026-08-07-dev-launch-03/screenshots/categories-hub__*.png` (390x844, 768x1024, 1024x768, 1440x900), or the scratchpad fallback screenshots if Playwright couldn't run.
- **Automated coverage proving all registry categories have descriptions:** `lib/__tests__/category-tree.test.ts` (`CATEGORY_TREE_L1 short descriptions (DEV-LAUNCH-03)` block) + `e2e/categories-hub.spec.ts`.
- **Canonical description source file/data structure:** `lib/category-tree.ts` — `L1CategoryDef.shortDescription` field on `CATEGORY_TREE_L1`.

- [ ] **Step 4: Report results to the user**

Summarize pass/fail for each verification step and list the exact evidence file paths above.
