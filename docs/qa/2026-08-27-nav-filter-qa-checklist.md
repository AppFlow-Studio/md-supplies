# QA checklist — Aug-24 remediation + nav compression & facet-filter correctness

**Branch:** `nav-filter-ui-polish` · **PR:** [#70](https://github.com/AppFlow-Studio/md-supplies/pull/70) → `catalog-cro-review`
**Base:** `catalog-cro-review` @ `eab0130` · **Head:** `d4d7b4f`

> ## This branch contains Izzy's and Sardor's Aug-24 work
>
> It was cut from `catalog-cro-review` @ `eab0130`, which **is** their remediation. Checking out
> `nav-filter-ui-polish` gives you **their work plus the 4 nav/filter commits** — there is nothing
> else to pull in.
>
> PR #70 reports "20 files changed" because that is the diff *on top of* `catalog-cro-review`, not
> the contents of the branch. PR [#71](https://github.com/AppFlow-Studio/md-supplies/pull/71)
> (→ `main`) shows 85 files precisely because `main` does **not** yet have their work — that diff
> is "Izzy + Sardor + me".
>
> **Section A below is their work**, re-verified on the same build as everything else, so you can
> test it in the same pass.

Every expected figure was measured against the **production** Storefront API on 2026-08-26/27. If
your run points at the QA store the counts will differ — the *behaviour* is what is being tested.

```bash
# from the repo root, nothing else on the port
git checkout nav-filter-ui-polish
rm -rf .next && npm run build && npm run start
```

---

## A. Izzy & Sardor's Aug-24 remediation — included here, verify it still holds

All of the following were re-checked against the build produced by this branch on 2026-08-27, with
the measured result shown. Nothing in the nav/filter work touches taxonomy, routes, revalidation or
blank-category handling.

### A1 · Nav — the original client complaint

The flat shortcut row's dropdowns must come from the **tag-derived category tree**, not from
Shopify Admin → Navigation. Mobility had no sub-links configured there, which is why its dropdown
was missing.

| Shortcut | Measured |
|---|---|
| **Mobility** | 4 links — `/category/mobility`, `…/wheelchair-cushions`, `…/wheelchair-accessories`, `…/transport-chairs` |
| **Home Care** | 4 links — `/category/home-care`, `…/lifts`, `…/bedside-commodes`, `…/raised-toilet-seat` |
| **Gloves** | 4 links — `…/exam-gloves`, `…/surgical-gloves`, `…/general-purpose-gloves` |
| **Testing & Screening** | 4 links — `…/specimen-collection`, `…/vital-sign-monitors`, `…/hiv-test` |

- [ ] **Mobility has a dropdown** and it lists real subcategories
- [ ] Home Care likewise
- [ ] These are unchanged by the nav work — only the big **Categories** mega-menu was redesigned

### A2 · All 25 category handles resolve

- [ ] Every one of the 25 departments loads with products, no "Category Unavailable"
- [ ] `/category/seating` (Room Furniture) → 512 · `/category/surgery-procedure` → 323 · `/category/trocars-trocar-kits` → 41

### A3 · Face Masks slug ↔ collection-handle mapping

Public slug `face-masks`, Shopify handle `face-coverings`.

- [ ] `/category/face-masks` → **35 products**, title `Medical Face Masks | Surgical & Disposable | MDSupplies`
- [ ] No 404, no redirect loop

### A4 · Surgery & Procedure / Trocars are two distinct pages (P0.5)

- [ ] `/category/surgery-procedure` → 323 products, H1 "Surgery & Procedure"
- [ ] `/category/trocars-trocar-kits` → 41 products, its own H1 — **not** the parent's name
- [ ] The Trocar page makes no FDA/regulatory claim

### A5 · Redirect integrity — all measured 301, single hop

| From | To |
|---|---|
| `/category/hygiene/hygiene` | `/category/hygiene` *(self-titled duplicate collapse)* |
| `/collections/all` | `/categories` |
| `/collections/surgery-procedure` | `/category/surgery-procedure` |
| `/collections/trocars-trocar-kits` | `/category/trocars-trocar-kits` |
| `/a/sitemap-tools/sitemap` | `/sitemap.xml` |

- [ ] Each is a **301**, one hop, no chain or loop
- [ ] Query strings survive the redirect (`/collections/surgery-procedure?sort=PRICE_ASC`)

### A6 · Sitemap is an index + sharded children

- [ ] `/sitemap.xml` is an **index**, listing `content.xml` and `products-0…N.xml`
- [ ] Each shard child loads and contains `<url>` entries

### A7 · Product Type is irrelevant to category routing

Its only live use is the `/search` facet allowlist.

- [ ] Locked by `lib/__tests__/filter-registry.test.ts` — runs in `npm test`
- [ ] Nothing in the nav/filter diff introduces Product Type into routing (grep the diff for `productType`)

### A8 · Blank-category resilience

- [ ] Exercise **Room Furniture** repeatedly: direct nav, category-to-category, hard refresh, back, forward
- [ ] It never renders a silently blank category
- [ ] On a transient Storefront failure the page degrades and logs a structured
      `{"context":"category-page","outcome":…}` line distinguishing *missing collection* /
      *fetch error* / *subcategory-scan failure* — not one collapsed blank result

### A9 · Revalidation (code review, not a click-through)

- [ ] Product webhook still invalidates the broad **collections** cache tag
- [ ] `dedupeSalt` still threaded so a retry re-fetches instead of replaying react `cache()`'s memoized rejection
- [ ] Confirm the nav/filter diff touches none of it

### A10 · Shower Commode taxonomy correction (read-only)

- [ ] Still under **Home Care**, in **Shower Commodes**
- [ ] Does **not** reappear under Mobility
- [ ] **No Shopify writes** during QA

---

## B. New in this branch — navigation

### B1 · The Categories menu is materially smaller

`/` → hover **Categories**.

| | Before | Now (measured) |
|---|---|---|
| Panel size | 800 × 556px, **1056px of content** (internal scrollbar) | **710 × 529px**, 527px of content — fits |
| Interactive items visible on open | 100 | **34** (25 department rows + 9 links) |
| Links in the DOM | 100 | 170 — all still crawlable (see B5) |

- [ ] No scrollbar **inside** the dropdown at 1440×900
- [ ] All 25 departments visible at once, two columns, none truncated mid-word

### B2 · The rail selects, the panel navigates

**Nothing in the department rail is a link.**

- [ ] Clicking a department **anywhere on its row** opens its subcategories in the right-hand panel
- [ ] The panel's **first row** is `All ‹Department› →` and navigates to that category page
- [ ] Subcategory links navigate to their L2 pages
- [ ] **Hovering does nothing** — wander over five or six departments; the open panel must not change
- [ ] The open department stays marked (tinted, bold, arrow nudged) with the pointer elsewhere
- [ ] Hovering a row slides its arrow — same motion as the homepage hero's OCC link

> The rail used to put a link (the name) and a disclosure control (an arrow) in one 26px row — two
> targets, two meanings, and the arrow was the glyph this site uses for "go somewhere" everywhere
> else. Three hover schemes were tried and each mis-fired; the reasoning is recorded in
> `components/layout/CategoryMegaMenu.tsx`.
> **Trade-off:** reaching a category page is now two clicks, not one.

### B3 · Keyboard

- [ ] `Tab` into the rail — focus visible, and focusing a department opens its panel
- [ ] `↓`/`↑` move between departments and bring the panel along · `Home`/`End` jump to first/last
- [ ] `→` steps into the open panel, landing on `All ‹Department›` · `Esc` closes the dropdown

### B4 · Trocars stays prominent

- [ ] Open Categories → **Trocars & Trocar Kits** visible immediately under `FEATURED` (click depth 1, whichever department is open)
- [ ] Open **Surgery & Procedure** → Trocars pinned **first**, badged `POPULAR`
- [ ] Both reach `/category/trocars-trocar-kits`, a different page from `/category/surgery-procedure`

### B5 · Crawlability preserved

- [ ] Every department still has one real `<a href="/category/…">` in view-source — it moved from the rail into the panel's `All …` link

### B6 · Mobile — same rule, drill-down shape

Test at **320 / 375 / 390 / 430 / 768**.

- [ ] Hamburger → **Categories** → department list
- [ ] Tapping a department **drills in**; it does not navigate
- [ ] The panel leads with `All ‹Department› →` · `‹ Categories` returns
- [ ] One department open at a time · a final link closes the drawer and loads the route
- [ ] Reopening after navigating starts back at the department list
- [ ] No horizontal page scroll at 320px *(except the homepage — see D4, pre-existing)*

---

## C. New in this branch — filters

### C1 · The reported bug

**`/category/home-care/bedside-commodes`** — 32 products.

| Category filter | Count shown | Click returns |
|---|---|---|
| Bedside Commodes | **32** | 32 |
| Shower Commodes | **1** | **1** — `Upholstered Drop Arm Wheeled Commode (11120SV-1F)` |

- [ ] **One** Shower Commodes option, not two
- [ ] Clicking returns exactly **1** — *before this branch it returned **8**, including Mobility transport chairs*
- [ ] The chip reads `Shower Commodes ×`, not raw JSON · URL carries **one** `filter=` parameter

**`/category/home-care/shower-commodes`** — 10 products.

| Category filter | Count | Click returns |
|---|---|---|
| Manual Wheelchairs 24 | 1 | 1 |
| Shower Chairs | 1 | 1 |
| Shower Commodes | **9** | **9** |

- [ ] Three options, not four — *before, the two spellings showed 2 and 2 while returning 5 and 4*

**The numbers reconcile** — useful if any single one looks wrong:

```
WHOLE CATALOGUE — Shower Commode(s): 12
  category:home-care → 10   (9 tagged shower-commodes, 1 tagged bedside-commodes)
  category:mobility  →  2   (transport chairs — correctly absent from Home Care)

/category/home-care                    + Shower Commodes → 10
/category/home-care/shower-commodes    + Shower Commodes →  9
/category/home-care/bedside-commodes   + Shower Commodes →  1
```

### C2 · Filter state stays in sync

- [ ] Select → URL updates, result count matches the facet count, checkbox ticks, chip appears
- [ ] Deselect → URL cleans, results restore
- [ ] Hard refresh on a filtered URL → identical selection and results
- [ ] Back → unfiltered · Forward → filtered again, checkbox still ticked
- [ ] `Clear all` removes facets but keeps sort / search / page size
- [ ] Zero results shows the normal empty state, not an error

> With a value selected, other values **in the same group** still show full counts (e.g.
> `Bedside Commodes 32` while Shower Commodes is ticked). That is standard faceted behaviour — a
> count ignores its own group's selection, so it reads "click this to get 32". Counts in *other*
> groups do narrow.

### C3 · The wider blast radius (worst case before the fix)

- [ ] **`/category/capes-gowns`** (Apparel) + Brand `Dynarex` → **39 products**, every card apparel. *Before, this rendered from a 1,000-product whole-catalogue set.*
- [ ] `/category/seating` and `/category/face-masks` behave the same with any filter applied

### C4 · Surgical Gloves rich filters still work

- [ ] `/category/gloves` — Category, Type, Material, Size, Thickness, Other Features, Sterility all render
- [ ] Selecting one does not break the other groups' counts

---

## D. Open decisions — your call, nothing blocked

### D1 · `Shower Commodes 1` on Bedside Commodes

The count is **correct**: one of the 32 bedside commodes (11120SV-1F) also carries the Shower
Commode value, and clicking returns exactly that product. But a filter narrowing 32 → 1 is
low-value and, under a "CATEGORY" heading, reads like a statement about the store.

| Option | Effect | Trade-off |
|---|---|---|
| **A. Leave it** | Accurate; finds the one dual-purpose product | Low-value rows stay as noise |
| **B. Hide low-share values** | Suppress Category values under ~5% of the page | Changes every L2 page; legitimate small overlaps vanish too |
| **C. Fix in Shopify** | Izzy decides whether 11120SV-1F should carry Shower Commode | Only helps if the answer is no — it may legitimately be both |

### D2 · Keep the `/search` facet-count correction?

`/search` carried the same broken counts. For `q=shower commode`: `Bariatric Commode Chairs`
**3 → 8**, `Bariatric Bath Benches` **2 → 4**, `Bariatric Shower Chairs` **1 → 3**.
**Search relevance is untouched** — same 215 results, same order. Only the numbers beside filter
values changed.

### D3 · Mega-menu child cap

6 subcategories per department (was 3). Visible items on open 100 → 34; DOM links 100 → 170.
One-line change if a smaller DOM is preferred.

---

## E. Pre-existing — **do not report these as regressions**

Each **reproduces on `catalog-cro-review` with this branch stashed and rebuilt**. Full write-ups in
`docs/audits/2026-08-26-home-care-filter-anomalies.md` (appendix).

| # | Issue | Owner |
|---|---|---|
| E1 | **`tag:"subcategory:…"` matches by token, not exactly.** `/category/mobility/walkers` renders **43** products while the nav tree counts **20**, because Shopify's tag search also matches `folding-walkers`, `posterior-walkers`, `knee-walkers`, `wheeled-walkers`. Affects every L2 sharing a token with a sibling. | Sardor |
| E2 | **`/category/mobility/wheelchairs` 404s — correctly.** No product carries `subcategory:wheelchairs` (0 of 7,385). The QA list's "Wheelchairs" is a Category *facet value*, not a route. | none |
| E3 | **`/category/apparel` resolves but is unregistered.** 200 with 153 products, no `filterRegistry` entry (Apparel is registered under `capes-gowns`), so it shows Availability + Price only and its chip prints raw filter JSON. | Sardor |
| E4 | **Homepage scrolls horizontally at 320px** — 336px of content, from the hero's `animate-pulse` skeleton boxes at `left: -16px`. Caught only intermittently by `e2e/320px-overflow.spec.ts`. | Sardor |
| E5 | **`e2e/categories-hub-integration.spec.ts:62` fails on the base branch**, both projects — it expects the hub grid to contain "Trocars & Trocar Kits", an assumption the P0.5 split invalidated. | Sardor |

---

## F. Shopify data — for Izzy, not fixable in the frontend

**18 groups of one concept spelled two ways** across production: `Shower Commode`/`Shower Commodes`,
`Bed`/`Beds`, `Gauze Roll`/`Gauze Rolls`, `COVID-19`/`Covid-19`, `dynaCare`/`DynaCare`, and 13 more.

The storefront renders **one option per concept** and queries **every** raw spelling, so nothing is
hidden and the merged option returns the union. **No Shopify data was written.** Full list with
per-product evidence: `docs/audits/2026-08-26-home-care-filter-anomalies.md`.

`dynaCare`/`DynaCare` and `LifeSign`/`lifeSign` need a brand-capitalisation decision, not a
mechanical merge. Also flagged there: `Manual Wheelchairs 24` leaking into the Category facet, and
values identical to their own category (`Home Care` on 32 Home Care products).

---

## G. Automated checks — expected results

```bash
npx tsc --noEmit     # clean
npm run lint         # clean
npm run build        # clean, 96/96 static pages
npm test             # 157 files, 1711 tests passing

PORT=3100 npm run start
E2E_BASE_URL=http://localhost:3100 npx playwright test \
  responsive.spec.ts surgery-trocar-split.spec.ts keyboard-nav.spec.ts contrast.spec.ts \
  --workers=2
# → 353 passed, 2 skipped, 0 failed
```

**Use `--workers=2`.** At full parallelism against one local server hitting the live Shopify API,
screenshot steps time out and produce spurious failures — verified as machine contention, not
defects (the same tests pass serially).

New coverage: 19 mega-menu tests, 10 mobile-nav tests, 9 exact-facet-count tests, 15 canonicalization
tests, plus a guard asserting `SEARCH_PRODUCTS_BY_TAG` never re-selects `productFilters` — the exact
regression that caused the filter bug.

---

## H. Gap in my own testing

Everything above ran **locally against production Shopify data**. There is **no Vercel preview** —
that needs a deploy I did not perform. If you want a preview pass before merging #70, that is the
outstanding step.
