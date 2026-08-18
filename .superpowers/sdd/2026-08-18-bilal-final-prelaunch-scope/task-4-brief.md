## Task 4: Fix non-clickable "You May Also Need" product cards

**Files:**
- Modify: `components/product/ProductView.tsx:693-724` (the "More products — overflow scroll row" section)
- Test: `components/product/__tests__/ProductView.test.tsx`, `components/product/__tests__/ProductView.a11y.test.tsx`

**Interfaces:**
- Consumes: `RelatedProductCard` (already defined at `ProductView.tsx:32-73`, already used by "Frequently Bought With" at line 670 and "You May Also Like" at line 686) — takes `{ product: CollectionProduct }`, already renders a full `<Link href={`/product/${product.handle}`}>` wrapping image, title, brand badge, label badges (including the shared Free Shipping resolver claim), and price, with a `group` class for hover states
- Produces: nothing new — reuses the existing component as-is

The bug: the "You May Also Need" section (unlike its two siblings) hand-rolls a bare `<div>` per card (line 707) instead of using `RelatedProductCard` — no `Link`, no keyboard focus, no accessible name. `relatedProducts.slice(4)` items are already typed `CollectionProduct`, the exact type `RelatedProductCard` consumes — this is a pure component-swap, no new data plumbing needed.

- [ ] **Step 1: Write the failing test**

In `components/product/__tests__/ProductView.test.tsx`, find the existing "You May Also Need" / overflow-row test block (search for `relatedProducts.slice(4)` or `'You May Also Need'` in the test file to find where it's already rendered/asserted — there is very likely an existing test asserting the section renders titles/prices; extend it rather than duplicating render setup). Add:

```ts
it('You May Also Need cards are real links to the product page', () => {
  // (reuse this file's existing render setup / relatedProducts fixture with 5+ items)
  const links = screen.getAllByRole('link', { name: /Extra Recommended Item/i })
  expect(links.length).toBeGreaterThan(0)
  expect(links[0]).toHaveAttribute('href', '/product/extra-recommended-item')
})
```

Adjust the fixture product title/handle to match whatever fixture data the existing "You May Also Need" test in this file already uses (read it first — do not invent new fixture names that collide).

In `components/product/__tests__/ProductView.a11y.test.tsx`, add an assertion (using the file's existing `axe` invocation pattern) that the "You May Also Need — scrollable product list" region has zero accessibility violations after the fix, including keyboard operability (existing a11y test file likely already has a helper for tab-order/keyboard checks — reuse it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx`
Expected: FAIL — `getByRole('link', ...)` finds nothing because the cards are `<div>`s.

- [ ] **Step 3: Write minimal implementation**

Replace `ProductView.tsx:706-720` (the `.slice(4).map(...)` block) with:

```tsx
              {relatedProducts.slice(4).map((item) => (
                <div key={item.id} className="w-[185px] sm:w-[201px] shrink-0">
                  <RelatedProductCard product={item} />
                </div>
              ))}
```

`RelatedProductCard`'s own root is a `<Link className="group flex flex-col bg-neutral-50 flex-1 min-w-[160px]">` (line 39) — the wrapping `<div>` here only carries the fixed scroll-row width (`w-[185px] sm:w-[201px] shrink-0`) that the original hand-rolled markup had, since `RelatedProductCard`'s own `flex-1 min-w-[160px]` is sized for a flex-wrap grid, not a fixed-width scroll row. No nested interactive elements are introduced — `RelatedProductCard` has no button inside its `<Link>` today (confirm this stays true; if a future Quick Add button is ever added inside `RelatedProductCard`, it must not go inside the `<Link>` — flag this as a standing constraint in a comment).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx`
Expected: PASS.

- [ ] **Step 5: Manual verification across both PDP routes and breakpoints**

Using `claude-in-chrome` (load via `ToolSearch` first) or a manual walkthrough: load a product with 5+ related products on both `/product/[slug]` and `/category/[slug]/[product]`, confirm image+title click and Enter/Space-via-keyboard-focus both navigate to the correct PDP, at both a desktop and a 375px-ish mobile viewport. Record the product handle(s) tested in the Task 12 evidence doc.

- [ ] **Step 6: Commit**

```bash
git add components/product/ProductView.tsx components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx
git commit -m "fix(pdp): make You May Also Need cards clickable via existing RelatedProductCard"
```

---

