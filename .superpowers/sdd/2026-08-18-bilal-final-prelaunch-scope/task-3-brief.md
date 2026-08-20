## Task 3: Trocar Supplies quick-link, dedicated-entry-point verification, and nav placement

**Files:**
- Read first (investigation, no guessing): `components/category/CategoryPageView.tsx` (confirm it already renders collection description, breadcrumbs, SEO metadata via `buildCategoryMetadata`, canonical URL, and `Product`/`CollectionPage` schema — Task 2's research found `app/category/[slug]/page.tsx` delegates entirely to this component and `buildCategoryMetadata`) and the primary nav component that consumes `buildCategoryNav()` from `lib/category-nav.ts` (grep for `buildCategoryNav` usage to find it)
- Modify: whichever nav component renders `primary`/`more` from `buildCategoryNav()` — add the "prominent quick link, exception to alphabetical order" for Trocar Supplies
- Test: the nav component's existing test file (find via the component's own `__tests__/` sibling)

**Interfaces:**
- Consumes: `buildCategoryNav(collections)` → `{ primary: NavEntry[]; more: NavEntry[] }` (`lib/category-nav.ts:76-93`, unchanged)

`lib/category-nav.ts` already lists `trocars-trocar-kits` first in "Surgery & Procedure"'s `matchedHandles` (line 36), and `buildCategoryNav` picks the first **live** handle — so today "Surgery & Procedure" in the primary nav already resolves straight to the Trocar collection (the other 4 matched handles — `disposable-3-2mm-3-5mm-trocars`, `disposable-4-5mm-trocars`, `reusable-3-2mm-3-5mm-trocars`, `reusable-4-5mm-trocars` — are very likely not live Shopify collections; confirm this in Step 1, don't assume). This means the "exception to alphabetical navigation" and "prominent quick link" requirement may already be satisfied by existing nav order (verify: is nav order in the primary/more groups literally alphabetical elsewhere, i.e. would Trocar's position under "Surgery & Procedure" need special-casing, or does `ROADMAP_CATEGORIES`' declared array order already win because nav isn't re-sorted?).

- [ ] **Step 1: Investigate current nav rendering order**

Find the component consuming `buildCategoryNav` (`grep -rn "buildCategoryNav" components/ app/`). Read it fully. Confirm: (a) does it re-sort `primary`/`more` alphabetically, or preserve `ROADMAP_CATEGORIES`' declared array order? (b) is "Surgery & Procedure" currently reachable and does it land on the Trocar collection? Write down the answer as a one-paragraph note in this task's PR description — this determines whether Step 2 is a real code change or a no-op verification.

- [ ] **Step 2: Write the failing test (only if Step 1 found a real gap)**

If nav is alphabetically sorted and Trocar/Surgery & Procedure would fall out of a prominent position, write a test in the nav component's test file asserting "Surgery & Procedure" (or a dedicated "Trocar Supplies" entry, per what Step 1 found) renders within the first N primary entries regardless of alphabetical position. Use the component's existing test patterns — do not invent a new test-rendering approach.

If Step 1 found the current order already satisfies "prominent, exception to alphabetical" (e.g., nav order already follows `ROADMAP_CATEGORIES`' declared array, which is not alphabetized), skip to Step 5 and record this as a verified no-op in the QA evidence doc (Task 12) instead of writing dead code.

- [ ] **Step 3: Run test to verify it fails** (skip if Step 2 was skipped)

Run the nav component's test file. Expected: FAIL for the stated reason.

- [ ] **Step 4: Write minimal implementation** (skip if Step 2 was skipped)

Implement the smallest change that satisfies the new test — likely a pinned-position rule in the nav-rendering component, not in `category-nav.ts` (keep the pure `buildCategoryNav` function generic; pin position where rendering happens).

- [ ] **Step 5: Confirm CategoryPageView already supplies breadcrumbs/SEO/canonical/schema**

Read `buildCategoryMetadata` and the JSX `CategoryPageView` renders for breadcrumbs and structured data. Confirm each of Bilal's asks is present for any category (not Trocar-specific — this is a shared component) with real evidence (function names/line numbers), not assumption. If any piece is missing (e.g., no `CollectionPage` schema block), that becomes a new sub-task — do not silently skip; report it in the Task 12 evidence doc.

- [ ] **Step 6: Commit**

```bash
git add <files touched in Steps 2/4>
git commit -m "feat(nav): prominent Trocar Supplies quick link, exception to alphabetical order"
```
(Only if Steps 2-4 produced a real change. If Step 1/5 were pure verification, no commit — note the finding in Task 12's evidence doc instead.)

---

