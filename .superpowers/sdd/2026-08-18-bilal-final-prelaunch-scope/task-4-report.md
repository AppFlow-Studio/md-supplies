# Task 4 Report: Fix non-clickable "You May Also Need" product cards

## What I implemented

`components/product/ProductView.tsx` — the "You May Also Need" overflow scroll
row (`relatedProducts.slice(4)`) hand-rolled a bare `<div>` per card instead of
reusing the shared `RelatedProductCard` component that its two siblings
("Frequently Bought With", "You May Also Like") already use. Replaced the
hand-rolled markup with `RelatedProductCard`, keeping only a thin wrapper
`<div>` for the fixed scroll-row width (`w-[185px] sm:w-[201px] shrink-0`),
exactly as the brief specified. Added a code comment recording the standing
constraint that `RelatedProductCard`'s `<Link>` root must never gain a nested
`<button>` (e.g. a future Quick Add).

No changes to `RelatedProductCard` itself — reused as-is.

## What I tested and results

- `components/product/__tests__/ProductView.test.tsx` — added a new describe
  block with a fixture of 5 `CollectionProduct` items (4 filler + 1 named
  "Extra Recommended Item" / handle `extra-recommended-item`, landing in the
  `slice(4)` overflow row) and an assertion that `getAllByRole('link', {name:
  ...})` finds a real link with the correct `href`.
- `components/product/__tests__/ProductView.a11y.test.tsx` — added a new
  describe block asserting the "You May Also Need — scrollable product list"
  region contains a real `<a href>` link (not a div), that it can receive
  focus (`link.focus(); expect(link).toHaveFocus()`), and that it contains no
  nested `<button>` (interactive-in-interactive check).

**Deviation from the brief worth flagging:** the brief assumed (a) an
existing "You May Also Need" test already existed in `ProductView.test.tsx`
to extend, and (b) `ProductView.a11y.test.tsx` already had an `axe()`
invocation pattern and a keyboard/tab-order helper to reuse. Neither was
true — I verified by grepping the whole test suite for `axe` (case
insensitive): the only hit is `@axe-core/playwright`, used exclusively by
the Playwright e2e specs under `e2e/` (`e2e/axe.spec.ts`,
`e2e/axe-states.spec.ts`, `e2e/contrast.spec.ts`), never wired into the
vitest suite. `ProductView.test.tsx` had no "You May Also Need" test at all
(every existing `renderPDP` call passes `relatedProducts={[]}`). So instead
of inventing a nonexistent `axe()` call or fabricating a fixture that
doesn't exist, I: (1) wrote a genuinely new test in `ProductView.test.tsx`
following that file's existing render/fixture conventions, and (2) in the
a11y file, followed its actual existing pattern — role/attribute/focus
assertions via Testing Library — documented this rationale in a comment
above the new describe block so it doesn't read as an oversight.

## TDD Evidence

**RED**

```
npm test -- components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx
```

Result: 2 failed, 32 passed.

- `ProductView.test.tsx`: `TestingLibraryElementError: Unable to find an
  accessible element with the role "link" and name` /Extra Recommended
  Item/i` — expected, because the cards were bare `<div>`s with no `<a>`.
- `ProductView.a11y.test.tsx`: same failure — `Unable to find an accessible
  element with the role "link" and name /Need Item Five/i`, with the
  accessible-roles dump showing only `img`/`paragraph` for that content,
  confirming no link role existed.

**GREEN**

```
npm test -- components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx
```

Result: `Test Files 2 passed (2)`, `Tests 34 passed (34)`.

## Manual browser verification

Not possible in this environment. `mcp__claude-in-chrome__tabs_context_mcp`
returned: "Browser extension is not connected. Please ensure the Claude
browser extension is installed and running..." I did start the Next.js dev
server (`npm run dev`, Turbopack, ready in 916ms, `GET / 200`) and confirmed
it served `http://localhost:3000` (curl 200), but with no working browser
automation tool I could not drive it to load a PDP, click a "You May Also
Need" card, or exercise Tab+Enter keyboard navigation at desktop/375px
viewports. I stopped the dev server afterward rather than leave it running
unattended.

This is flagged as a concern per the task instructions rather than
fabricated. The automated test evidence above (a real `<a href>` in the DOM,
proven focusable via `.focus()`/`toHaveFocus()`, with the correct
`/product/<handle>` href, reusing the exact same `RelatedProductCard`
component already proven to work for "Frequently Bought With" and "You May
Also Like") is strong indirect evidence the fix behaves correctly in a real
browser, since it is byte-for-byte the same component/markup pattern as its
two working siblings — but it is not a substitute for an actual click-and-
navigate browser walkthrough.

## Full test suite

```
npm test
```

Result: `Test Files 146 passed (146)`, `Tests 1499 passed (1499)` (1497
pre-existing + 2 new). Confirmed via `git stash` that the pre-existing
`Not implemented: navigation to another Document` jsdom console warnings
predate this change (also present, 1497 passed, on the unmodified branch)
— not introduced by this fix.

Also ran and confirmed clean:
- `npx eslint components/product/ProductView.tsx components/product/__tests__/ProductView.test.tsx components/product/__tests__/ProductView.a11y.test.tsx` — no output, no errors.
- `npx tsc --noEmit` — no output, no errors.

## Files changed

- `components/product/ProductView.tsx` — swapped hand-rolled `<div>` cards
  for `RelatedProductCard` in the "You May Also Need" overflow row
  (lines ~706-720 pre-change).
- `components/product/__tests__/ProductView.test.tsx` — added
  `CollectionProduct` import and a new describe block with a real-link
  assertion.
- `components/product/__tests__/ProductView.a11y.test.tsx` — added a new
  describe block asserting focusability, correct href, and no nested
  interactive elements.

## Self-review findings

- Fully implemented the brief: component swap done exactly as specified,
  wrapper `<div>` carries only the fixed scroll-row width.
- Confirmed the fix reuses `RelatedProductCard` (not a duplicate/adapted
  copy) — `<RelatedProductCard product={item} />` is a direct call to the
  existing component already used by the two sibling sections.
- Confirmed no nested interactive elements: `RelatedProductCard`'s only
  interactive element is its own root `<Link>`; no `<button>` inside it
  today, verified by the new a11y test's
  `within(link).queryByRole('button')).not.toBeInTheDocument()` assertion
  and by reading `RelatedProductCard`'s source (lines 32-73 of
  `ProductView.tsx`) directly.
- Both new tests assert real behavior: link role + `href` value, not mere
  text presence.
- Test output is pristine (no new console warnings/errors from these
  tests); full suite passes at 1499/1499.

## Issues or concerns

- Manual browser verification (brief Step 5) could not be performed — the
  claude-in-chrome browser extension was not connected in this environment.
  Automated test coverage (RED→GREEN evidence above) is the primary
  evidence; recommend a human (or a session with a connected browser
  extension) spot-check a live PDP with 5+ related products on both
  `/product/[slug]` and `/category/[slug]/[product]` before/at launch, per
  the brief's Step 5, and record the product handle(s) tested in the Task 12
  evidence doc as originally instructed.
- The brief's assumptions about pre-existing test/fixture scaffolding
  (an existing "You May Also Need" test in `ProductView.test.tsx`, and an
  `axe()` pattern in `ProductView.a11y.test.tsx`) did not match the actual
  state of the repo. I did not invent fixtures or dependencies to match the
  brief's description — I wrote tests that match each file's real, current
  conventions instead. Flagging this in case the brief's author wants the
  axe-core-in-vitest gap tracked as a separate follow-up item.
