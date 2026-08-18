## Task 9: Investigate and fix the 320px homepage/search overflow

**Files:**
- Investigate first: homepage (`app/page.tsx` or equivalent — locate via `Glob`) and search (`app/search/page.tsx` or equivalent) components
- Test: Playwright, since this is a real-viewport rendering bug, not unit-testable in jsdom

Research found no existing TODO/marker for this — genuinely uninvestigated. Do not guess the cause.

- [ ] **Step 1: Reproduce at 320px**

Using `claude-in-chrome` (load tools via `ToolSearch` first) or Playwright directly, load the homepage and `/search?q=<term>` at a 320px viewport width. Screenshot both. Identify the specific element(s) causing horizontal overflow (use `read_console_messages`/`javascript_tool` to run `document.querySelectorAll('*')` width-vs-viewport diffing, or visually inspect via the screenshot plus `get_page_text`/`read_page` for the DOM structure at the point of overflow).

- [ ] **Step 2: Write a failing Playwright test**

In `e2e/` (matching the existing spec file naming pattern, e.g. `e2e/320px-overflow.spec.ts`), assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (or `window.innerWidth`) at a 320px viewport for both the homepage and a search results page. Run it, confirm it fails and reproduces the exact overflow amount.

- [ ] **Step 3: Fix the specific overflowing element(s)**

Whatever Step 1 identified — likely a fixed-width element, an unwrapped long string, or a flex/grid item without `min-width: 0`. Make the minimal CSS/markup change. Do not touch unrelated responsive breakpoints.

- [ ] **Step 4: Run the Playwright test to verify it passes**

Run: `npm run test:e2e -- e2e/320px-overflow.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add <files touched> e2e/320px-overflow.spec.ts
git commit -m "fix(layout): eliminate 320px horizontal overflow on homepage and search"
```

---

